from pathlib import Path
import unittest


ROOT = Path(__file__).resolve().parents[2]


class WebRtcTurnConfigTests(unittest.TestCase):
    def test_compose_internet_hardens_coturn_quotas_and_blocks_private_ips(self):
        compose = (ROOT / "compose.internet.yaml").read_text(encoding="utf-8")
        self.assertIn("--use-auth-secret", compose)
        self.assertIn("--no-multicast-peers", compose)
        self.assertIn("--user-quota=4", compose)
        self.assertIn("--total-quota=32", compose)
        for denied in (
            "--denied-peer-ip=0.0.0.0-0.255.255.255",
            "--denied-peer-ip=10.0.0.0-10.255.255.255",
            "--denied-peer-ip=100.64.0.0-100.127.255.255",
            "--denied-peer-ip=127.0.0.0-127.255.255.255",
            "--denied-peer-ip=169.254.0.0-169.254.255.255",
            "--denied-peer-ip=172.16.0.0-172.31.255.255",
            "--denied-peer-ip=192.168.0.0-192.168.255.255",
        ):
            self.assertIn(denied, compose)

    def test_ice_config_enforces_bearer_role_check_no_store_and_expiring_hmac_turn(self):
        ice = (ROOT / "infra/internet/ice-config.mjs").read_text(encoding="utf-8")
        self.assertIn('res.setHeader("Cache-Control", "no-store")', ice)
        self.assertIn('authorization?.startsWith("Bearer ")', ice)
        self.assertIn('role === "DOCTOR" || role === "PATIENT"', ice)
        self.assertIn('createHmac("sha1", TURN_SHARED_SECRET)', ice)
        self.assertIn("+ 3600", ice)
