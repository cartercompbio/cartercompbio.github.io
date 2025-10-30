// Load and display publications with highlighting
async function loadPublications() {
    try {
        const response = await fetch('publications/publications.json?_=' + Date.now());
        const publications = await response.json();

        const container = document.getElementById('publications-list');
        if (!container) return;

        let html = '';

        // Scholar link
        html += '<p><a href="https://scholar.google.com/citations?user=nlWQnXMAAAAJ&hl=en">Complete bibliography</a></p><hr>';

        // Regular years in descending order
        const years = Object.keys(publications)
            .filter(key => !isNaN(key))
            .sort((a, b) => b - a);

        years.forEach(year => {
            html += `<h3>${year}</h3><ul>`;
            publications[year].forEach(pub => {
                html += `<li>${highlightPublication(pub)}</li>`;
            });
            html += '</ul>';
        });

        // Special categories
        if (publications.reviews && publications.reviews.length > 0) {
            html += '<h3>Reviews</h3><ul>';
            publications.reviews.forEach(pub => {
                html += `<li>${highlightPublication(pub)}</li>`;
            });
            html += '</ul>';
        }

        if (publications.protocols && publications.protocols.length > 0) {
            html += '<h3>Protocols</h3><ul>';
            publications.protocols.forEach(pub => {
                html += `<li>${highlightPublication(pub)}</li>`;
            });
            html += '</ul>';
        }

        container.innerHTML = html;

    } catch (error) {
        console.error('Error loading publications:', error);
    }
}

/**
 * Highlights journal names (italics) and lab authors (bold) in citation text
 */
function highlightPublication(pub) {
    let text = pub.citation;

    // Highlight journal name (italics)
    if (pub.journal) {
        const journal = escapeRegex(pub.journal);
        text = text.replace(new RegExp(journal, 'g'), `<em>${pub.journal}</em>`);
    }

    // Highlight lab authors (bold)
    if (pub.labAuthors && pub.labAuthors.length > 0) {
        pub.labAuthors.forEach(author => {
            const authorEscaped = escapeRegex(author);
            text = text.replace(new RegExp(authorEscaped, 'g'), `<strong>${author}</strong>`);
        });
    }

    // Add URL link if provided
    if (pub.url) {
        text += ` <a href="${pub.url}" target="_blank">[Link]</a>`;
    }

    return text;
}

/**
 * Escape special regex characters
 */
function escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Load publications when page loads
document.addEventListener('DOMContentLoaded', loadPublications);
