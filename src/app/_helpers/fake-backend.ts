import { Injectable } from '@angular/core';
import { HttpRequest, HttpResponse, HttpHandler, HttpEvent, HttpInterceptor, HTTP_INTERCEPTORS } from '@angular/common/http';
import { Observable, of, throwError, timer } from 'rxjs';
import { delay, materialize, dematerialize, mergeMap } from 'rxjs/operators';
import { AlertService } from '@app/_services';
import { Role } from '@app/_models';

const accountsKey = 'angular-21-boilerplate-accounts';
let accounts: any[] = JSON.parse(localStorage.getItem(accountsKey)!) || [];

@Injectable()
export class FakeBackendInterceptor implements HttpInterceptor {
    constructor(private alertService: AlertService) {}

    intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        const { url, method, headers, body } = request;
        const alertService = this.alertService;

        return of(null).pipe(mergeMap(() => handleRoute()));

        function handleRoute() {
            switch (true) {
                case url.endsWith('/accounts/authenticate') && method === 'POST':
                    return authenticate();
                case url.endsWith('/accounts/refresh-token') && method === 'POST':
                    return refreshToken();
                case url.endsWith('/accounts/revoke-token') && method === 'POST':
                    return revokeToken();
                case url.endsWith('/accounts/register') && method === 'POST':
                    return register();
                case url.endsWith('/accounts/verify-email') && method === 'POST':
                    return verifyEmail();
                case url.endsWith('/accounts/forgot-password') && method === 'POST':
                    return forgotPassword();
                case url.endsWith('/accounts/validate-reset-token') && method === 'POST':
                    return validateResetToken();
                case url.endsWith('/accounts/reset-password') && method === 'POST':
                    return resetPassword();
                case url.endsWith('/accounts') && method === 'GET':
                    return getAccounts();
                case url.match(/\/accounts\/\d+$/) && method === 'GET':
                    return getAccountById();
                case url.match(/\/accounts\/\d+$/) && method === 'PUT':
                    return updateAccount();
                case url.match(/\/accounts\/\d+$/) && method === 'DELETE':
                    return deleteAccount();
                default:
                    return next.handle(request);
            }
        }

        function authenticate() {
            const { email, password } = body;
            const account = accounts.find(x => x.email === email && x.password === password);
            if (!account) return error('Email or password is incorrect');
            account.refreshTokens = account.refreshTokens || [];
            account.refreshTokens.push(generateRefreshToken());
            localStorage.setItem(accountsKey, JSON.stringify(accounts));
            return ok({
                ...basicDetails(account),
                jwtToken: generateJwtToken(account)
            });
        }

        function refreshToken() {
            const refreshToken = getRefreshToken();
            if (!refreshToken) return unauthorized();
            const account = accounts.find(x => x.refreshTokens?.includes(refreshToken));
            if (!account) return unauthorized();
            account.refreshTokens = account.refreshTokens.filter((x: string) => x !== refreshToken);
            account.refreshTokens.push(generateRefreshToken());
            localStorage.setItem(accountsKey, JSON.stringify(accounts));
            return ok({
                ...basicDetails(account),
                jwtToken: generateJwtToken(account)
            });
        }

        function revokeToken() {
            const refreshToken = getRefreshToken();
            const account = accounts.find(x => x.refreshTokens?.includes(refreshToken));
            if (account) {
                account.refreshTokens = account.refreshTokens.filter((x: string) => x !== refreshToken);
                localStorage.setItem(accountsKey, JSON.stringify(accounts));
            }
            return ok({});
        }

        function register() {
            const account = body;
            if (accounts.find(x => x.email === account.email)) {
                setTimeout(() => alertService.info(`
                    <h4>Email Already Registered</h4>
                    <p>Your email <strong>${account.email}</strong> is already registered.</p>
                    <p>If you don't know your password please visit the <a href="/account/forgot-password">forgot password</a> page.</p>
                `), 1000);
                return ok({});
            }
            account.id = newAccountId();
            account.role = accounts.length === 0 ? Role.Admin : Role.User;
            account.isVerified = true;
            const verifyToken = new Date().getTime().toString();
            account.verifyToken = verifyToken;
            accounts.push(account);
            localStorage.setItem(accountsKey, JSON.stringify(accounts));
            setTimeout(() => alertService.info(`
                <h4>Verification Email</h4>
                <p>Thanks for registering!</p>
                <p>Please click the below link to verify your email address:</p>
                <p><a href="${location.origin}/account/verify-email?token=${verifyToken}">Click here to verify</a></p>
            `), 1000);
            return ok({});
        }

        function verifyEmail() {
            const { token } = body;
            const account = accounts.find(x => x.verifyToken === token);
            if (!account) return error('Verification failed');
            account.isVerified = true;
            localStorage.setItem(accountsKey, JSON.stringify(accounts));
            return ok({});
        }

        function forgotPassword() {
            const { email } = body;
            const account = accounts.find(x => x.email === email);
            if (!account) return ok({});
            account.resetToken = new Date().getTime().toString();
            account.resetTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
            localStorage.setItem(accountsKey, JSON.stringify(accounts));
            setTimeout(() => alertService.info(`
                <h4>Reset Password Email</h4>
                <p>Please click the below link to reset your password, the link will be valid for 1 day:</p>
                <p><a href="${location.origin}/account/reset-password?token=${account.resetToken}">Click here to reset</a></p>
            `), 1000);
            return ok({});
        }

        function validateResetToken() {
            const { token } = body;
            const account = accounts.find(x => x.resetToken === token && new Date() < new Date(x.resetTokenExpires));
            if (!account) return error('Invalid token');
            return ok({});
        }

        function resetPassword() {
            const { token, password } = body;
            const account = accounts.find(x => x.resetToken === token && new Date() < new Date(x.resetTokenExpires));
            if (!account) return error('Invalid token');
            account.password = password;
            account.resetToken = undefined;
            account.resetTokenExpires = undefined;
            localStorage.setItem(accountsKey, JSON.stringify(accounts));
            return ok({});
        }

        function getAccounts() {
            if (!isAdmin()) return unauthorized();
            return ok(accounts.map(x => basicDetails(x)));
        }

        function getAccountById() {
            const account = getAccount();
            if (!account) return notFound();
            if (account.id !== currentAccount()?.id && !isAdmin()) return unauthorized();
            return ok(basicDetails(account));
        }

        function updateAccount() {
            const account = getAccount();
            if (!account) return notFound();
            if (account.id !== currentAccount()?.id && !isAdmin()) return unauthorized();
            if (!body.password) delete body.password;
            Object.assign(account, body);
            localStorage.setItem(accountsKey, JSON.stringify(accounts));
            return ok(basicDetails(account));
        }

        function deleteAccount() {
            const account = getAccount();
            if (!account) return notFound();
            if (account.id !== currentAccount()?.id && !isAdmin()) return unauthorized();
            accounts = accounts.filter(x => x.id !== account.id);
            localStorage.setItem(accountsKey, JSON.stringify(accounts));
            return ok({});
        }

        // helper functions
        function ok(body?: any) {
            return of(new HttpResponse({ status: 200, body }));
        }

        function error(message: string) {
            return throwError(() => ({ error: { message } }));
        }

        function unauthorized() {
            return throwError(() => ({ status: 401, error: { message: 'Unauthorized' } }));
        }

        function notFound() {
            return throwError(() => ({ status: 404, error: { message: 'Not Found' } }));
        }

        function basicDetails(account: any) {
            const { id, title, firstName, lastName, email, role, isVerified } = account;
            return { id, title, firstName, lastName, email, role, isVerified };
        }

        function isAdmin() {
            return currentAccount()?.role === Role.Admin;
        }

        function currentAccount() {
            const authHeader = headers.get('Authorization');
            if (!authHeader?.startsWith('Bearer fake-jwt-token')) return undefined;
            const jwtToken = JSON.parse(atob(authHeader.split('.')[1]));
            const tokenExpired = Date.now() > (jwtToken.exp * 1000);
            if (tokenExpired) return undefined;
            return accounts.find(x => x.id === jwtToken.id);
        }

        function getAccount() {
            const urlParts = url.split('/');
            const id = parseInt(urlParts[urlParts.length - 1]);
            return accounts.find(x => x.id === id);
        }

        function getRefreshToken() {
            return document.cookie.split(';').find(x => x.includes('fakeRefreshToken'))?.split('=')[1];
        }

        function generateRefreshToken() {
            const token = new Date().getTime().toString();
            document.cookie = `fakeRefreshToken=${token}; path=/;`;
            return token;
        }

        function generateJwtToken(account: any) {
            const tokenPayload = {
                exp: Math.round(new Date(Date.now() + 15 * 60 * 1000).getTime() / 1000),
                id: account.id
            };
            return `fake-jwt-token.${btoa(JSON.stringify(tokenPayload))}`;
        }

        function newAccountId() {
            return accounts.length ? Math.max(...accounts.map(x => x.id)) + 1 : 1;
        }
    }
}

export const fakeBackendProvider = {
    provide: HTTP_INTERCEPTORS,
    useClass: FakeBackendInterceptor,
    multi: true
};