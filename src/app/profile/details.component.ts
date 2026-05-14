import { Component } from '@angular/core';
import { Account } from '@app/_models';
import { AccountService } from '@app/_services';

@Component({ standalone: false, templateUrl: 'details.component.html' })
export class DetailsComponent {
    account: Account | null;

    constructor(private accountService: AccountService) {
        this.account = this.accountService.accountValue;
    }
}