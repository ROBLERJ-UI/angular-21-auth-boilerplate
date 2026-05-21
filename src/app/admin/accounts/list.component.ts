import { Component, OnInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { AccountService } from '@app/_services';
import { Account } from '@app/_models';
import { filter } from 'rxjs/operators';

@Component({ standalone: false, templateUrl: 'list.component.html' })
export class ListComponent implements OnInit {
    accounts!: Account[];

    constructor(
        private accountService: AccountService,
        private router: Router
    ) {}

    ngOnInit() {
        this.loadAccounts();
    }

    loadAccounts() {
        this.accountService.getAll()
            .subscribe({
                next: accounts => {
                    console.log('Accounts loaded:', accounts);
                    this.accounts = accounts;
                },
                error: error => {
                    console.error('Failed to load accounts:', error);
                    this.accounts = [];
                }
            });
    }

    deleteAccount(account: any) {
        account.isDeleting = true;
        this.accountService.delete(account.id)
            .subscribe(() => {
                this.accounts = this.accounts.filter(x => x.id !== account.id);
            });
    }
}