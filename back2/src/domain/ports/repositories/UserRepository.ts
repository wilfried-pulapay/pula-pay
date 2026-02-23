import { User } from '../../entities/User';

export interface CreateUserParams {
  phone: string;
  email?: string;
  name?: string;
}

/**
 * Repository port for User persistence
 * Note: User creation is primarily handled by Better Auth.
 * This interface is used for domain-level user lookups and updates.
 */
export interface UserRepository {
  findById(id: string): Promise<User | null>;
  findByPhone(phone: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  create(params: CreateUserParams): Promise<User>;
  update(user: User): Promise<User>;
  delete(id: string): Promise<void>;
}
