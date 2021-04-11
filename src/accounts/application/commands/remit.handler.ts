import { Inject, NotFoundException } from '@nestjs/common';
import { CommandHandler, EventPublisher, ICommandHandler } from '@nestjs/cqrs';
import { RemitCommand } from 'src/accounts/application/commands/remit.command';
import AccountRepository from 'src/accounts/domain/repository';
import { AccountDomainService } from 'src/accounts/domain/service';

@CommandHandler(RemitCommand)
export class RemitHandler implements ICommandHandler<RemitCommand> {
  constructor(
    @Inject('AccountRepositoryImplement')
    readonly accountRepository: AccountRepository,
    readonly eventPublisher: EventPublisher,
    readonly accountDomainService: AccountDomainService,
  ) {}

  async execute(command: RemitCommand): Promise<void> {
    const senderData = await this.accountRepository.findById(command.senderId);
    if (!senderData) throw new NotFoundException();

    const sender = this.eventPublisher.mergeObjectContext(senderData);

    const receiverData = await this.accountRepository.findById(
      command.receiverId,
    );
    if (!receiverData) throw new NotFoundException();

    const receiver = this.eventPublisher.mergeObjectContext(receiverData);

    const { password, amount } = command;
    this.accountDomainService.remit({ sender, receiver, password, amount });

    await this.accountRepository.save([receiver, sender]);

    receiver.commit();
    sender.commit();
  }
}