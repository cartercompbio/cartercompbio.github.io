// Handle smooth scrolling with offset for sticky navigation
document.addEventListener('DOMContentLoaded', function() {
    // Get all navigation links
    const navLinks = document.querySelectorAll('.main-nav a[href^="#"]');

    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();

            // Get the target section ID from the href
            const targetId = this.getAttribute('href').substring(1);
            let targetSection = document.getElementById(targetId);

            // People menu entries open their tab, then scroll to the People section
            if (targetId.startsWith('people-') && typeof showPeopleTab === 'function') {
                showPeopleTab(targetId);
                targetSection = document.getElementById('people');
                this.blur();   // close the menu
            }

            if (targetSection) {
                scrollToSection(targetSection);
            }
        });
    });
});

/**
 * Scroll so the section sits just below the sticky nav
 */
function scrollToSection(section, behavior = 'smooth') {
    const navHeight = document.querySelector('.main-nav').offsetHeight;
    const targetPosition = section.getBoundingClientRect().top + window.pageYOffset - navHeight - 20;
    window.scrollTo({ top: targetPosition, behavior });
}
