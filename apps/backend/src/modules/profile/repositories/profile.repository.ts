import { PrismaService } from '@/core/prisma/prisma.service';
import { Prisma, User as PrismaUser } from '@/generated/prisma/client';
import { Profile, UsernameTakenError } from '@/modules/profile/domain/profile';
import { Injectable, NotFoundException } from '@nestjs/common';

const mapPrismaUserToProfile = (user: PrismaUser): Profile => ({
  username: user.displayUsername ?? user.username ?? '',
  name: user.name,
  bio: user.bio,
  defaultQuackMood: user.defaultQuackMood,
});

const isUniqueViolation = (error: unknown): boolean =>
  error instanceof Prisma.PrismaClientKnownRequestError &&
  error.code === 'P2002';

@Injectable()
export class ProfileRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string): Promise<Profile> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException();
    return mapPrismaUserToProfile(user);
  }

  // Case-insensitive: older accounts (e.g. the seed) store mixed-case
  // usernames, and "alice" next to "Alice" would be impossible to tell apart.
  async isUsernameTaken(
    username: string,
    exceptUserId: string,
  ): Promise<boolean> {
    const owner = await this.prisma.user.findFirst({
      where: {
        username: { equals: username, mode: 'insensitive' },
        id: { not: exceptUserId },
      },
      select: { id: true },
    });
    return owner !== null;
  }

  async updateProfile(
    userId: string,
    data: {
      username: string;
      displayUsername: string;
      name: string;
      bio: string | null;
      defaultQuackMood: Profile['defaultQuackMood'];
    },
  ): Promise<Profile> {
    try {
      const user = await this.prisma.user.update({
        where: { id: userId },
        data: { ...data, updatedAt: new Date() },
      });
      return mapPrismaUserToProfile(user);
    } catch (error) {
      // Someone claimed the name between our check and this write.
      if (isUniqueViolation(error)) {
        throw new UsernameTakenError(data.displayUsername);
      }
      throw error;
    }
  }
}
