import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { AccountService } from '@app/_services';
import { Account } from '@app/_models';

@Component({ standalone: false, templateUrl: 'list.component.html' })
export class ListComponent implements OnInit {
    accounts: Account[] = [];

    constructor(
        private accountService: AccountService,
        private cdr: ChangeDetectorRef
    ) {}

    ngOnInit() {
        this.loadAccounts();
    }

    loadAccounts() {
        this.accountService.getAll()
            .subscribe({
                next: accounts => {
                    this.accounts = accounts;
                    this.cdr.detectChanges();
                },
                error: error => {
                    console.error('Failed to load accounts:', error);
                    this.accounts = [];
                    this.cdr.detectChanges();
                }
            });
    }

    deleteAccount(account: any) {
        account.isDeleting = true;
        this.accountService.delete(account.id)
            .subscribe(() => {
                this.accounts = this.accounts.filter(x => x.id !== account.id);
                this.cdr.detectChanges();
            });
    }
}