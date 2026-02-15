import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  create(email: string, passwordHash: string): Promise<User> {
    const user = this.usersRepository.create({
      email: email.toLowerCase().trim(),
      passwordHash,
    });
    return this.usersRepository.save(user);
  }

  findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { email: email.toLowerCase().trim() },
    });
  }

  findById(id: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id } });
  }
}
