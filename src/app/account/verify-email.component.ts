import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AccountService, AlertService } from '@app/_services';

@Component({ standalone: false, templateUrl: 'verify-email.component.html' })
export class VerifyEmailComponent implements OnInit {
    verifying = true;
    failed = false;

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private accountService: AccountService,
        private alertService: AlertService
    ) {}

    ngOnInit() {
        const token = this.route.snapshot.queryParams['token'];
        this.accountService.verifyEmail(token)
            .subscribe({
                next: () => {
                    this.alertService.success('Verification successful, you can now login', { keepAfterRouteChange: true });
                    this.router.navigate(['/account/login']);
                },
                error: () => {
                    this.failed = true;
                    this.verifying = false;
                }
            });
    }
}