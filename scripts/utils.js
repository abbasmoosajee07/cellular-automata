function switchThemes() {
    // Theme toggle functionality
    const themeToggle = document.getElementById('themeToggle');
    const themeIcon = document.getElementById('themeIcon');
    const themeText = document.getElementById('themeText'); // Add this line

    // Check for saved theme preference or default to dark
    const currentTheme = localStorage.getItem('theme') || 'dark';

    // Apply the saved theme on page load
    if (currentTheme === 'light') {
        document.body.classList.add('light');
        themeIcon.classList.remove('bi-moon-fill');
        themeIcon.classList.add('bi-sun-fill');
        themeText.textContent = 'Light Mode'; // Add this line
    } else {
        themeText.textContent = 'Dark Mode'; // Add this line
    }

    themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('light');

        if (document.body.classList.contains('light')) {
            themeIcon.classList.remove('bi-moon-fill');
            themeIcon.classList.add('bi-sun-fill');
            themeText.textContent = 'Light Mode'; // Add this line
            localStorage.setItem('theme', 'light');
        } else {
            themeIcon.classList.remove('bi-sun-fill');
            themeIcon.classList.add('bi-moon-fill');
            themeText.textContent = 'Dark Mode'; // Add this line
            localStorage.setItem('theme', 'dark');
        }
    });

    // Initialize theme icon based on current theme
    if (currentTheme === 'dark') {
        themeIcon.classList.remove('bi-sun-fill');
        themeIcon.classList.add('bi-moon-fill');
        themeText.textContent = 'Dark Mode'; // Add this line
    }
}

switchThemes();