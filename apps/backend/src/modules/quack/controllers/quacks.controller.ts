import {
  InvalidReplyError,
  NotQuackAuthorError,
  QuackNotFoundError,
  ReplyToDeletedQuackError,
} from '@/modules/quack/domain/quack';
import { QuacksService } from '@/modules/quack/services/quacks.service';
import { User } from '@/shared/auth/decorators/user.decorator';
import { Identity } from '@/shared/auth/domain/identity';
import { AuthenticatedUserGuard } from '@/shared/auth/guards/authenticated-user.guard';
import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  Query,
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
import { CreateQuackDto } from './dto/create-quack.dto';
import { ListQuacksQueryDto } from './dto/list-quacks.query.dto';
import { QuackResponseDto } from './dto/quack.response.dto';

@ApiTags('quacks')
@Controller('quacks')
@UseGuards(AuthenticatedUserGuard)
@ApiCookieAuth()
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
)
export class QuacksController {
  constructor(private readonly quacksService: QuacksService) {}

  @Get()
  @ApiOperation({
    summary:
      'List quacks, optionally only your own, with a hashtag and/or matching a search term',
  })
  @ApiResponse({ status: 200, type: [QuackResponseDto] })
  @ApiResponse({
    status: 400,
    description:
      'Search term too long, mine is not true/false, or tag is not a hashtag',
  })
  @ApiResponse({ status: 401, description: 'Not signed in' })
  async list(
    @User() user: Identity,
    @Query() query: ListQuacksQueryDto,
  ): Promise<QuackResponseDto[]> {
    const quacks = await this.quacksService.getQuacks(user, {
      search: query.q,
      mine: query.mine,
      tag: query.tag,
    });
    return quacks.map(QuackResponseDto.fromDomain);
  }

  @Get(':id/conversation')
  @ApiOperation({
    summary:
      'The conversation a quack belongs to: the quack that started it and every reply, oldest first',
    description:
      'Deleted quacks that still have replies are included (isDeleted, no content), ' +
      'so the tree can be built from parentId.',
  })
  @ApiResponse({ status: 200, type: [QuackResponseDto] })
  @ApiResponse({ status: 401, description: 'Not signed in' })
  @ApiResponse({ status: 404, description: 'No such quack (or deleted)' })
  async conversation(
    @User() user: Identity,
    @Param('id') id: string,
  ): Promise<QuackResponseDto[]> {
    try {
      const quacks = await this.quacksService.getConversation(user, id);
      return quacks.map(QuackResponseDto.fromDomain);
    } catch (error) {
      if (error instanceof QuackNotFoundError) {
        throw new NotFoundException(error.message);
      }
      throw error;
    }
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a quack, or a reply (parentId)' })
  @ApiResponse({ status: 201, type: QuackResponseDto })
  @ApiResponse({
    status: 400,
    description:
      'Invalid text, mood or answers, or a reply with a mood or poll',
  })
  @ApiResponse({ status: 401, description: 'Not signed in' })
  @ApiResponse({
    status: 404,
    description: 'The quack replied to does not exist',
  })
  @ApiResponse({
    status: 409,
    description: 'The quack replied to was deleted',
  })
  async create(
    @User() user: Identity,
    @Body() body: CreateQuackDto,
  ): Promise<QuackResponseDto> {
    try {
      const quack = await this.quacksService.createQuack(user, {
        text: body.text,
        mood: body.mood ?? null,
        poll: body.poll ? { options: body.poll.options } : null,
        parentId: body.parentId ?? null,
      });
      return QuackResponseDto.fromDomain(quack);
    } catch (error) {
      if (error instanceof InvalidReplyError) {
        throw new BadRequestException(error.message);
      }
      if (error instanceof QuackNotFoundError) {
        throw new NotFoundException(error.message);
      }
      if (error instanceof ReplyToDeletedQuackError) {
        throw new ConflictException(error.message);
      }
      throw error;
    }
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary:
      "Delete a quack (with its poll and votes): your own, or anyone's if you are an admin",
    description:
      'A quack with replies keeps its place as a deleted quack with no ' +
      'text, author, mood or poll; its replies stay. Without replies it is ' +
      'removed, with any deleted quack above it that has nothing left under it.',
  })
  @ApiResponse({ status: 204, description: 'Deleted' })
  @ApiResponse({ status: 401, description: 'Not signed in' })
  @ApiResponse({
    status: 403,
    description: "Someone else's quack and you are not an admin",
  })
  @ApiResponse({
    status: 404,
    description: 'No such quack (or already deleted)',
  })
  async delete(@User() user: Identity, @Param('id') id: string): Promise<void> {
    try {
      await this.quacksService.deleteQuack(user, id);
    } catch (error) {
      if (error instanceof NotQuackAuthorError) {
        throw new ForbiddenException(error.message);
      }
      if (error instanceof QuackNotFoundError) {
        throw new NotFoundException(error.message);
      }
      throw error;
    }
  }
}
