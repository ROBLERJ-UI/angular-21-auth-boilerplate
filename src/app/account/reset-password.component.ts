import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AccountService, AlertService } from '@app/_services';
import { MustMatch } from '@app/_helpers';

enum TokenStatus { Validating, Valid, Invalid }

@Component({ standalone: false, templateUrl: 'reset-password.component.html' })
export class ResetPasswordComponent implements OnInit {
    TokenStatus = TokenStatus;
    tokenStatus = TokenStatus.Validating;
    token!: string;
    form!: FormGroup;
    loading = false;
    submitted = false;
    error = '';

    constructor(
        private formBuilder: FormBuilder,
        private route: ActivatedRoute,
        private router: Router,
        private accountService: AccountService,
        private alertService: AlertService,
        private cdr: ChangeDetectorRef
    ) {}

    ngOnInit() {
        this.token = this.route.snapshot.queryParams['token'];
        this.form = this.formBuilder.group({
            password: ['', [Validators.required, Validators.minLength(6)]],
            confirmPassword: ['', Validators.required]
        }, {
            validators: MustMatch('password', 'confirmPassword')
        });

        this.accountService.validateResetToken(this.token)
            .subscribe({
                next: () => { 
                    this.tokenStatus = TokenStatus.Valid;
                    this.cdr.detectChanges();
                },
                error: () => { 
                    this.tokenStatus = TokenStatus.Invalid;
                    this.cdr.detectChanges();
                }
            });
    }

    get f() { return this.form.controls; }

    onSubmit() {
        this.submitted = true;
        if (this.form.invalid) return;
        this.loading = true;
        this.accountService.resetPassword(this.token, this.f['password'].value, this.f['confirmPassword'].value)
            .subscribe({
                next: () => {
                    this.alertService.success('Password reset successful, you can now login', { keepAfterRouteChange: true });
                    this.router.navigate(['/account/login']);
                },
                error: err => {
                    this.error = err;
                    this.loading = false;
                }
            });
    }
}