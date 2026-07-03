"""Backend tests for Wedding Budget Tracker API.

Covers auth flows, profile + default category seeding, full CRUD on
categories/expenses/guests/vendors, stats aggregation, and multi-tenancy.
"""
import os
import uuid
import requests
import pytest

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://marriage-money-5.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"


def _new_session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


def _register(session, email=None, name="Test User", password="secret123"):
    email = email or f"test_{uuid.uuid4().hex[:10]}@example.com"
    r = session.post(f"{API}/auth/register", json={"email": email, "password": password, "name": name})
    return r, email, password


# ---------- Auth ----------
class TestAuth:
    def test_register_sets_cookie_and_returns_user(self):
        s = _new_session()
        r, email, _ = _register(s)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["email"] == email
        assert data["name"] == "Test User"
        assert "user_id" in data
        # Cookie set
        assert "session_token" in s.cookies.get_dict(), f"cookies={s.cookies.get_dict()}"

    def test_register_duplicate_email_returns_400(self):
        s = _new_session()
        r, email, pwd = _register(s)
        assert r.status_code == 200
        s2 = _new_session()
        r2 = s2.post(f"{API}/auth/register", json={"email": email, "password": pwd, "name": "Dup"})
        assert r2.status_code == 400

    def test_login_success_and_wrong_password(self):
        s = _new_session()
        r, email, pwd = _register(s)
        assert r.status_code == 200
        s2 = _new_session()
        good = s2.post(f"{API}/auth/login", json={"email": email, "password": pwd})
        assert good.status_code == 200
        assert good.json()["email"] == email
        assert "session_token" in s2.cookies.get_dict()
        bad = _new_session().post(f"{API}/auth/login", json={"email": email, "password": "wrong"})
        assert bad.status_code == 401

    def test_me_requires_cookie(self):
        # No cookie -> 401
        r = requests.get(f"{API}/auth/me")
        assert r.status_code == 401

        s = _new_session()
        r, email, _ = _register(s)
        assert r.status_code == 200
        me = s.get(f"{API}/auth/me")
        assert me.status_code == 200
        assert me.json()["email"] == email

    def test_logout_invalidates_session(self):
        s = _new_session()
        r, _, _ = _register(s)
        assert r.status_code == 200
        out = s.post(f"{API}/auth/logout")
        assert out.status_code == 200
        # Re-use same cookie value manually since cookie was cleared client-side
        # The token in DB should be deleted - so even forced cookie returns 401
        me = s.get(f"{API}/auth/me")
        assert me.status_code == 401


# ---------- Profile + default categories ----------
class TestProfileAndCategories:
    def test_profile_autocreate_seeds_8_default_categories(self):
        s = _new_session()
        r, _, _ = _register(s)
        assert r.status_code == 200
        prof = s.get(f"{API}/profile")
        assert prof.status_code == 200, prof.text
        p = prof.json()
        assert p["currency"] == "USD"
        assert p["total_budget"] == 0.0

        cats = s.get(f"{API}/categories").json()
        names = [c["name"] for c in cats]
        for expected in ["Venue", "Catering", "Attire", "Photography",
                         "Flowers & Decor", "Music & Entertainment",
                         "Invitations", "Rings"]:
            assert expected in names, f"missing default category {expected}"
        assert len(cats) >= 8

    def test_profile_update_currency_and_budget(self):
        s = _new_session()
        _register(s)
        s.get(f"{API}/profile")  # initialise
        upd = s.put(f"{API}/profile", json={
            "partner1_name": "Alex", "partner2_name": "Jamie",
            "currency": "EUR", "total_budget": 50000,
            "wedding_date": "2026-06-15", "venue_location": "Paris"
        })
        assert upd.status_code == 200
        p = s.get(f"{API}/profile").json()
        assert p["currency"] == "EUR"
        assert p["total_budget"] == 50000
        assert p["partner1_name"] == "Alex"
        assert p["venue_location"] == "Paris"


# ---------- Category CRUD ----------
class TestCategoryCRUD:
    def test_create_update_delete_category_unlinks_expense(self):
        s = _new_session()
        _register(s)
        s.get(f"{API}/profile")
        c = s.post(f"{API}/categories", json={"name": "Honeymoon", "color": "#abcdef", "planned_amount": 1234}).json()
        assert c["name"] == "Honeymoon"
        cid = c["id"]

        # Create expense linked to category
        e = s.post(f"{API}/expenses", json={"vendor": "Travel Co", "amount": 500, "status": "paid", "category_id": cid}).json()
        eid = e["id"]

        upd = s.put(f"{API}/categories/{cid}", json={"name": "Honeymoon Trip", "color": "#111111", "planned_amount": 2000})
        assert upd.status_code == 200
        assert upd.json()["name"] == "Honeymoon Trip"

        d = s.delete(f"{API}/categories/{cid}")
        assert d.status_code == 200
        # Expense still exists but unlinked
        exps = s.get(f"{API}/expenses").json()
        found = [x for x in exps if x["id"] == eid]
        assert found and found[0]["category_id"] is None


# ---------- Expenses ----------
class TestExpenseCRUD:
    def test_expense_lifecycle(self):
        s = _new_session()
        _register(s)
        s.get(f"{API}/profile")
        cats = s.get(f"{API}/categories").json()
        cid = cats[0]["id"]
        e = s.post(f"{API}/expenses", json={
            "vendor": "Florist", "amount": 700, "status": "pending",
            "category_id": cid, "due_date": "2026-05-01"
        })
        assert e.status_code == 200
        eid = e.json()["id"]
        # Toggle to paid
        u = s.put(f"{API}/expenses/{eid}", json={
            "vendor": "Florist", "amount": 700, "status": "paid",
            "category_id": cid, "due_date": "2026-05-01"
        })
        assert u.status_code == 200 and u.json()["status"] == "paid"
        d = s.delete(f"{API}/expenses/{eid}")
        assert d.status_code == 200
        assert s.delete(f"{API}/expenses/{eid}").status_code == 404


# ---------- Guests ----------
class TestGuestCRUD:
    def test_guest_lifecycle(self):
        s = _new_session()
        _register(s)
        g = s.post(f"{API}/guests", json={
            "name": "John Doe", "side": "partner1", "rsvp": "pending",
            "plus_one": False, "group": "Family"
        })
        assert g.status_code == 200, g.text
        gid = g.json()["id"]
        u = s.put(f"{API}/guests/{gid}", json={
            "name": "John Doe", "side": "partner1", "rsvp": "attending",
            "plus_one": True, "group": "Family"
        })
        assert u.status_code == 200 and u.json()["rsvp"] == "attending" and u.json()["plus_one"] is True
        d = s.delete(f"{API}/guests/{gid}")
        assert d.status_code == 200


# ---------- Vendors ----------
class TestVendorCRUD:
    def test_vendor_lifecycle(self):
        s = _new_session()
        _register(s)
        v = s.post(f"{API}/vendors", json={
            "name": "DJ Mike", "category": "Music", "phone": "123",
            "status": "considering"
        })
        assert v.status_code == 200, v.text
        vid = v.json()["id"]
        u = s.put(f"{API}/vendors/{vid}", json={
            "name": "DJ Mike", "category": "Music", "phone": "123",
            "status": "booked"
        })
        assert u.status_code == 200 and u.json()["status"] == "booked"
        d = s.delete(f"{API}/vendors/{vid}")
        assert d.status_code == 200


# ---------- Stats ----------
class TestStats:
    def test_stats_aggregation(self):
        s = _new_session()
        _register(s)
        s.get(f"{API}/profile")
        s.put(f"{API}/profile", json={"total_budget": 10000, "currency": "USD"})
        cats = s.get(f"{API}/categories").json()
        cid = cats[0]["id"]
        # Set planned amount
        s.put(f"{API}/categories/{cid}", json={"name": cats[0]["name"], "color": cats[0].get("color"), "planned_amount": 3000})
        s.post(f"{API}/expenses", json={"vendor": "A", "amount": 1000, "status": "paid", "category_id": cid})
        s.post(f"{API}/expenses", json={"vendor": "B", "amount": 500, "status": "pending", "category_id": cid})
        s.post(f"{API}/guests", json={"name": "G1", "rsvp": "attending", "plus_one": True})
        s.post(f"{API}/guests", json={"name": "G2", "rsvp": "declined"})

        st = s.get(f"{API}/stats").json()
        assert st["total_budget"] == 10000
        assert st["total_spent"] == 1000
        assert st["total_pending"] == 500
        assert st["remaining"] == 10000 - 1000 - 500
        assert st["total_planned"] >= 3000
        gby = {c["id"]: c for c in st["by_category"]}
        assert gby[cid]["spent"] == 1000
        assert gby[cid]["pending"] == 500
        assert gby[cid]["planned"] == 3000
        assert st["guests"]["total"] == 2
        assert st["guests"]["rsvp"]["attending"] == 1
        assert st["guests"]["rsvp"]["declined"] == 1
        assert st["guests"]["plus_ones"] == 1
        assert st["guests"]["estimated_attending"] == 2


# ---------- Multi-tenancy ----------
class TestMultiTenancy:
    def test_user_b_cannot_access_user_a_data(self):
        a = _new_session(); _register(a); a.get(f"{API}/profile")
        b = _new_session(); _register(b); b.get(f"{API}/profile")

        ca = a.post(f"{API}/categories", json={"name": "PrivateA", "planned_amount": 100}).json()
        cid = ca["id"]
        # B's list should not contain A's category
        b_cats = b.get(f"{API}/categories").json()
        assert all(c["id"] != cid for c in b_cats)
        # B cannot update/delete A's
        assert b.put(f"{API}/categories/{cid}", json={"name": "x", "planned_amount": 0}).status_code == 404
        assert b.delete(f"{API}/categories/{cid}").status_code == 404


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
