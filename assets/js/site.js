function renderSharedLayout() {
  const headerTarget = document.querySelector("[data-site-header]");
  const footerTarget = document.querySelector("[data-site-footer]");
  const year = new Date().getFullYear();

  if (headerTarget) {
    headerTarget.innerHTML = `
      <header class="site-header">
        <div class="site-container">
          <p class="site-brand">Philosophical Logic Notes</p>
          <nav class="site-nav" aria-label="Main navigation">
            <a href="/homepage/">Homepage</a>
            <a href="/about/">About</a>
            <a href="/textbooks/">Textbooks</a>
            <a href="/contact/">Contact</a>
            <span data-auth-slot></span>
          </nav>
        </div>
      </header>
    `;
  }

  if (footerTarget) {
    footerTarget.innerHTML = `
      <footer class="site-footer">
        <div class="site-container">
          <p class="muted">© ${year} Philosophical Logic Notes</p>
        </div>
      </footer>
    `;
  }
}

function setupContactForm() {
  const form = document.querySelector("[data-contact-form]");
  const status = document.querySelector("[data-contact-status]");
  if (!form || !status) {
    return;
  }

  form.addEventListener("submit", function onSubmit(event) {
    event.preventDefault();
    const name = form.querySelector("#name");
    const email = form.querySelector("#email");
    const message = form.querySelector("#message");

    if (!name.value.trim() || !email.value.trim() || !message.value.trim()) {
      status.textContent = "Please fill all fields before submitting.";
      status.style.color = "#b91c1c";
      return;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email.value.trim())) {
      status.textContent = "Please provide a valid email address.";
      status.style.color = "#b91c1c";
      return;
    }

    status.textContent = "Thanks. This is a local demo form; backend submission will be added later.";
    status.style.color = "#065f46";
    form.reset();
  });
}

document.addEventListener("DOMContentLoaded", function onReady() {
  renderSharedLayout();
  setupContactForm();
});
