// Handle smooth scrolling with offset for sticky navigation
document.addEventListener('DOMContentLoaded', function() {
    // Get all navigation links
    const navLinks = document.querySelectorAll('.main-nav a[href^="#"]');

    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();

            // Get the target section ID from the href
            const targetId = this.getAttribute('href').substring(1);
            const targetSection = document.getElementById(targetId);

            if (targetSection) {
                // Get the height of the sticky nav
                const navHeight = document.querySelector('.main-nav').offsetHeight;

                // Calculate position with offset
                const targetPosition = targetSection.getBoundingClientRect().top + window.pageYOffset - navHeight - 20;

                // Smooth scroll to position
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });
});
