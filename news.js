// Load and display news from unified JSON data file
async function loadNews() {
    try {
        const response = await fetch('news/news_data.json');
        const newsItems = await response.json();

        // Sort by date (newest first)
        newsItems.sort((a, b) => {
            const dateA = parseNewsDate(a.date);
            const dateB = parseNewsDate(b.date);
            return dateB - dateA;
        });

        // Display only the first 6 most recent items
        displayNews(newsItems.slice(0, 6));

    } catch (error) {
        console.error('Error loading news:', error);
    }
}

function displayNews(newsItems) {
    const newsGrid = document.querySelector('.news-grid');
    if (!newsGrid) return;

    newsGrid.innerHTML = '';

    newsItems.forEach(item => {
        const newsDiv = document.createElement('div');
        newsDiv.className = 'news-item';

        const dateDiv = document.createElement('div');
        dateDiv.className = 'news-date';
        dateDiv.textContent = formatNewsDate(item);

        const contentDiv = document.createElement('div');
        contentDiv.className = 'news-content';

        // Create link to detail page using ID
        const link = document.createElement('a');
        link.href = `news/item/?id=${item.id}`;
        link.textContent = item.title;
        link.className = 'news-link';

        contentDiv.appendChild(link);
        newsDiv.appendChild(dateDiv);
        newsDiv.appendChild(contentDiv);
        newsGrid.appendChild(newsDiv);
    });
}

function formatNewsDate(item) {
    if (item.dateEnd) {
        return `${formatNewsDateString(item.date, 'short')} - ${formatNewsDateString(item.dateEnd, 'short')}`;
    }
    return formatNewsDateString(item.date, 'long');
}

// Load news when page loads
document.addEventListener('DOMContentLoaded', loadNews);
