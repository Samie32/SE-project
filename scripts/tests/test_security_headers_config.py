from pathlib import Path
import unittest


ROOT = Path(__file__).resolve().parents[2]


class SecurityHeadersConfigTests(unittest.TestCase):
    def test_caddyfile_sets_hsts_csp_and_frame_ancestors_for_frontend(self):
        caddyfile = (ROOT / "infra/internet/Caddyfile").read_text(encoding="utf-8")
        app_block = caddyfile.split("\n{$AUTH_HOST} {")[0]
        self.assertIn('Strict-Transport-Security "max-age=31536000; includeSubDomains"', app_block)
        self.assertIn('X-Content-Type-Options "nosniff"', app_block)
        self.assertIn('Referrer-Policy "same-origin"', app_block)
        self.assertIn('X-Frame-Options "DENY"', app_block)
        self.assertIn("Content-Security-Policy", app_block)
        self.assertIn("frame-ancestors 'none'", app_block)
        self.assertIn("connect-src 'self' https://{$AUTH_HOST}", app_block)
        self.assertIn("frame-src 'self' https://{$AUTH_HOST}", app_block)
        self.assertIn("object-src 'none'", app_block)

    def test_nginx_conf_sets_csp_and_frame_protection_inside_root_location(self):
        nginx = (ROOT / "frontend/nginx.conf").read_text(encoding="utf-8")
        root_block = nginx.split("location / {")[1]
        self.assertIn("X-Content-Type-Options nosniff always;", root_block)
        self.assertIn("Referrer-Policy same-origin always;", root_block)
        self.assertIn("X-Frame-Options DENY always;", root_block)
        self.assertIn("Content-Security-Policy", root_block)
        self.assertIn("frame-ancestors 'none'", root_block)
        self.assertNotIn("Strict-Transport-Security", nginx)
