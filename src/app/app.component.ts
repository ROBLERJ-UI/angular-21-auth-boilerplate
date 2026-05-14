import { Component } from '@angular/core';
import { AccountService } from '@app/_services';
import { Account } from '@app/_models';

@Component({ standalone: false, selector: 'app-root', templateUrl: './app.component.html' })
export class AppComponent {
    account: Account | null = null;

    constructor(private accountService: AccountService) {
        this.accountService.account.subscribe(x => this.account = x);
    }

    logout() {
        this.accountService.logout();
    }
}