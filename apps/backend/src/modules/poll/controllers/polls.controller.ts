import {
  NotPollAuthorError,
  PollClosedError,
  PollNotFoundError,
  PollOptionNotFoundError,
} from '@/modules/poll/domain/poll';
import { PollsService } from '@/modules/poll/services/polls.service';
import { User } from '@/shared/auth/decorators/user.decorator';
import { Identity } from '@/shared/auth/domain/identity';
import { AuthenticatedUserGuard } from '@/shared/auth/guards/authenticated-user.guard';
import {
  Body,
  ConflictException,
  Controller,
  Delete,
  ForbiddenException,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  Put,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { PollResponseDto } from './dto/poll.response.dto';
import { VoteDto } from './dto/vote.dto';

// The client tells "closed" apart from other failures by this code, to show
// "This question was closed before your vote." instead of "try again".
export const POLL_CLOSED_CODE = 'POLL_CLOSED';

const toHttpError = (error: unknown): unknown => {
  if (error instanceof PollClosedError) {
    return new ConflictException({
      statusCode: HttpStatus.CONFLICT,
      error: 'Conflict',
      code: POLL_CLOSED_CODE,
      message: error.message,
    });
  }
  if (error instanceof NotPollAuthorError) {
    return new ForbiddenException(error.message);
  }
  if (
    error instanceof PollNotFoundError ||
    error instanceof PollOptionNotFoundError
  ) {
    return new NotFoundException(error.message);
  }
  return error;
};

@ApiTags('polls')
@Controller('polls')
@UseGuards(AuthenticatedUserGuard)
@ApiCookieAuth()
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
)
export class PollsController {
  constructor(private readonly pollsService: PollsService) {}

  @Put(':pollId/vote')
  @ApiOperation({ summary: 'Vote, or move your vote to another answer' })
  @ApiResponse({ status: 200, type: PollResponseDto })
  @ApiResponse({ status: 401, description: 'Not signed in' })
  @ApiResponse({ status: 404, description: 'No such poll or answer' })
  @ApiResponse({
    status: 409,
    description: `Poll is closed (${POLL_CLOSED_CODE})`,
  })
  async vote(
    @User() user: Identity,
    @Param('pollId') pollId: string,
    @Body() body: VoteDto,
  ): Promise<PollResponseDto> {
    try {
      return PollResponseDto.fromDomain(
        await this.pollsService.vote(user, pollId, body.optionId),
      );
    } catch (error) {
      throw toHttpError(error);
    }
  }

  @Delete(':pollId/vote')
  @ApiOperation({ summary: 'Take your vote back (no-op if you have none)' })
  @ApiResponse({ status: 200, type: PollResponseDto })
  @ApiResponse({ status: 401, description: 'Not signed in' })
  @ApiResponse({ status: 404, description: 'No such poll' })
  @ApiResponse({
    status: 409,
    description: `Poll is closed (${POLL_CLOSED_CODE})`,
  })
  async withdrawVote(
    @User() user: Identity,
    @Param('pollId') pollId: string,
  ): Promise<PollResponseDto> {
    try {
      return PollResponseDto.fromDomain(
        await this.pollsService.withdrawVote(user, pollId),
      );
    } catch (error) {
      throw toHttpError(error);
    }
  }

  @Post(':pollId/close')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Close your own poll for good' })
  @ApiResponse({ status: 200, type: PollResponseDto })
  @ApiResponse({ status: 401, description: 'Not signed in' })
  @ApiResponse({ status: 403, description: 'Not the author' })
  @ApiResponse({ status: 404, description: 'No such poll' })
  @ApiResponse({
    status: 409,
    description: `Already closed (${POLL_CLOSED_CODE})`,
  })
  async close(
    @User() user: Identity,
    @Param('pollId') pollId: string,
  ): Promise<PollResponseDto> {
    try {
      return PollResponseDto.fromDomain(
        await this.pollsService.close(user, pollId),
      );
    } catch (error) {
      throw toHttpError(error);
    }
  }
}
