"""Verify the local branded login form and Authorization Code + PKCE with demo data.

Only prints check results, never credentials, authorization codes or tokens.
"""
import base64
import hashlib
import html
import http.cookiejar
import json
import secrets
from html.parser import HTMLParser
from pathlib import Path
from urllib.error import HTTPError
from urllib.parse import parse_qs, urlencode, urlsplit
from urllib.request import HTTPCookieProcessor, HTTPRedirectHandler, Request, build_opener


class StopAtCallback(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        if newurl.startswith('http://localhost:5173/callback'):
            return None
        return super().redirect_request(req, fp, code, msg, headers, newurl)


class LoginForm(HTMLParser):
    def __init__(self):
        super().__init__()
        self.action = ''
        self.fields = {}

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'form' and attrs.get('id') == 'kc-form-login':
            self.action = attrs['action']
        if tag == 'input' and attrs.get('type') == 'hidden' and attrs.get('name'):
            self.fields[attrs['name']] = attrs.get('value', '')


def main():
    root = Path(__file__).resolve().parent.parent
    settings = dict(line.split('=', 1) for line in (root / '.env').read_text(encoding='utf-8-sig').splitlines() if '=' in line and not line.startswith('#'))
    verifier = secrets.token_urlsafe(48)
    challenge = base64.urlsafe_b64encode(hashlib.sha256(verifier.encode()).digest()).rstrip(b'=').decode()
    state = secrets.token_urlsafe(24)
    query = urlencode(dict(client_id='clinic-web', redirect_uri='http://localhost:5173/callback', response_type='code', scope='openid profile email', state=state, code_challenge=challenge, code_challenge_method='S256'))
    cookies = http.cookiejar.CookieJar()
    opener = build_opener(HTTPCookieProcessor(cookies), StopAtCallback())
    with opener.open('http://localhost:8180/realms/clinic/protocol/openid-connect/auth?' + query, timeout=15) as res:
        page = res.read().decode()
    assert 'Nhập thông tin để tiếp tục đến cổng bệnh nhân.' in page, 'Branded login not rendered'
    assert 'name="username"' in page and 'name="password"' in page, 'Credentials form missing'
    assert 'Đăng nhập an toàn' not in page, 'Intermediate login copy still present'
    assert 'rememberMe' in page, 'Remember-me option missing'
    print('PASS: branded username/password form, remember-me and no intermediate button')
    form = LoginForm()
    form.feed(page)
    assert form.action.startswith('http://localhost:8180/'), 'Unexpected form destination'
    form.fields.update(username='patient', password=settings['DEMO_PASSWORD'])
    # Browsers accept Secure cookies on trustworthy http://localhost. urllib does not.
    # Emulate that browser behavior only for this fixed local Keycloak destination.
    local_cookies = '; '.join(cookie.name + '=' + cookie.value for cookie in cookies)
    try:
        opener.open(Request(html.unescape(form.action), data=urlencode(form.fields).encode(), headers={'Cookie': local_cookies}), timeout=15)
        raise AssertionError('Expected successful login redirect')
    except HTTPError as response:
        assert response.code == 302, 'Login response HTTP ' + str(response.code)
        redirect = response.headers.get('Location', '')
    values = parse_qs(urlsplit(redirect).query)
    assert values.get('state') == [state] and values.get('code'), 'Invalid callback'
    token_data = urlencode(dict(grant_type='authorization_code', client_id='clinic-web', redirect_uri='http://localhost:5173/callback', code=values['code'][0], code_verifier=verifier)).encode()
    with opener.open(Request('http://localhost:8180/realms/clinic/protocol/openid-connect/token', data=token_data), timeout=15) as res:
        token = json.load(res)['access_token']
    with opener.open(Request('http://localhost:8080/api/me', headers={'Authorization': 'Bearer ' + token}), timeout=15) as res:
        profile = json.load(res)
    assert 'PATIENT' in profile['roles'], 'Patient API access failed'
    print('PASS: password authentication, PKCE token exchange and patient API access')


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        # Exception bodies can contain auth redirect URLs. Do not print them.
        print('FAIL: login verification (' + type(error).__name__ + ')')
        if isinstance(error, AssertionError):
            print(str(error))
        raise SystemExit(1)
