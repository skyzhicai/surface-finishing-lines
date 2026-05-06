(function () {
  const navToggle = document.querySelector(".nav-toggle");
  const nav = document.querySelector(".site-nav");

  if (navToggle && nav) {
    navToggle.addEventListener("click", () => {
      const isOpen = nav.classList.toggle("open");
      navToggle.setAttribute("aria-expanded", String(isOpen));
      navToggle.textContent = isOpen ? "x" : "☰";
    });
  }

  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener("click", (event) => {
      const target = document.querySelector(link.getAttribute("href"));
      if (!target) return;
      event.preventDefault();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      if (nav && nav.classList.contains("open")) {
        nav.classList.remove("open");
        navToggle.setAttribute("aria-expanded", "false");
        navToggle.textContent = "☰";
      }
    });
  });

  document.querySelectorAll("[data-lead-form]").forEach((form) => {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const note = form.querySelector(".form-note");
      if (note) {
        note.textContent = "Thank you. Your application brief has been received for engineering review.";
        note.classList.add("visible");
      }
      form.reset();
    });
  });

  const activeSections = [...document.querySelectorAll(".content h2[id]")];
  const tocLinks = [...document.querySelectorAll(".toc a")];

  if ("IntersectionObserver" in window && activeSections.length && tocLinks.length) {
    const byId = new Map(tocLinks.map((link) => [link.getAttribute("href").slice(1), link]));
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          tocLinks.forEach((link) => link.classList.remove("active"));
          const link = byId.get(entry.target.id);
          if (link) link.classList.add("active");
        });
      },
      { rootMargin: "-20% 0px -70% 0px" }
    );

    activeSections.forEach((section) => observer.observe(section));
  }
})();

