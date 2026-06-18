/* global reservekitConfig */
(function () {
  "use strict";

  var API_BASE =
    typeof reservekitConfig !== "undefined" && reservekitConfig.apiBase
      ? reservekitConfig.apiBase
      : "";

  // ── Token ───────────────────────────────────────────────────────────────────
  // Matches the key used by the React SPA (AuthContext / api/client.js).

  function getToken() {
    return localStorage.getItem("rk_token");
  }

  // ── Message helper ──────────────────────────────────────────────────────────

  function setMessage(msgEl, text, isError) {
    msgEl.textContent = text;
    msgEl.className =
      "reservekit-message" +
      (isError ? " reservekit-message--error" : " reservekit-message--success");
  }

  // ── Per-form logic ──────────────────────────────────────────────────────────

  function initForm(form) {
    var eventId = form.dataset.eventId;
    var msgEl = document.getElementById("reservekit-msg-" + eventId);
    if (!msgEl) return;

    form.addEventListener("submit", function (e) {
      e.preventDefault();

      var token = getToken();
      if (!token) {
        setMessage(msgEl, "Please sign in to reserve a ticket.", true);
        return;
      }

      var select = form.querySelector('[name="tier_id"]');
      var tierId = select ? select.value : "";
      if (!tierId) {
        setMessage(msgEl, "Please select a tier.", true);
        return;
      }

      var submitBtn = form.querySelector('[type="submit"]');
      submitBtn.disabled = true;
      setMessage(msgEl, "Processing\u2026", false);

      fetch(API_BASE + "/api/reservations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token,
        },
        body: JSON.stringify({
          event_id: parseInt(eventId, 10),
          tier_id: parseInt(tierId, 10),
        }),
      })
        .then(function (res) {
          return res.json();
        })
        .then(function (json) {
          if (json.error) {
            var msg;
            switch (json.error.code) {
              case "CONFLICT":
                msg = "Sorry, this tier is now sold out.";
                break;
              case "UNAUTHORIZED":
                msg = "Please sign in to reserve a ticket.";
                break;
              case "FORBIDDEN":
                msg = "You do not have permission to reserve tickets.";
                break;
              default:
                msg = json.error.message || "Reservation failed. Please try again.";
            }
            setMessage(msgEl, msg, true);
          } else {
            setMessage(msgEl, "Reserved! Confirmation ID: " + json.data.id, false);
            form.reset();
          }
        })
        .catch(function () {
          setMessage(msgEl, "Network error. Please check your connection and try again.", true);
        })
        .finally(function () {
          submitBtn.disabled = false;
        });
    });
  }

  // ── Boot ────────────────────────────────────────────────────────────────────

  function init() {
    var forms = document.querySelectorAll(".reservekit-form");
    for (var i = 0; i < forms.length; i++) {
      initForm(forms[i]);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
