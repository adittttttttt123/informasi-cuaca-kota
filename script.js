// Initialize Lucide icons
lucide.createIcons();

const cityInput = document.getElementById('city-input');
const searchBtn = document.getElementById('search-btn');
const errorMessage = document.getElementById('error-message');
const weatherCard = document.getElementById('weather-card');
const loadingSpinner = document.getElementById('loading');

// DOM Elements for weather data
const cityNameEl = document.getElementById('city-name');
const countryNameEl = document.getElementById('country-name');
const localTimeEl = document.getElementById('local-time');
const localDateEl = document.getElementById('local-date');
const tempValueEl = document.getElementById('temp-value');
const weatherDescEl = document.getElementById('weather-desc');
const humidityValueEl = document.getElementById('humidity-value');
const windValueEl = document.getElementById('wind-value');
const body = document.body;

// Open-Meteo Weather Codes Mapping
const weatherCodes = {
    0: { desc: 'Cerah', icon: 'sun' },
    1: { desc: 'Sebagian Cerah', icon: 'cloud-sun' },
    2: { desc: 'Berawan', icon: 'cloud' },
    3: { desc: 'Mendung', icon: 'cloud' },
    45: { desc: 'Berkabut', icon: 'cloud-fog' },
    48: { desc: 'Kabut Tebal', icon: 'cloud-fog' },
    51: { desc: 'Gerimis Ringan', icon: 'cloud-drizzle' },
    53: { desc: 'Gerimis Sedang', icon: 'cloud-drizzle' },
    55: { desc: 'Gerimis Lebat', icon: 'cloud-drizzle' },
    61: { desc: 'Hujan Ringan', icon: 'cloud-rain' },
    63: { desc: 'Hujan Sedang', icon: 'cloud-rain' },
    65: { desc: 'Hujan Lebat', icon: 'cloud-rain' },
    71: { desc: 'Salju Ringan', icon: 'cloud-snow' },
    73: { desc: 'Salju Sedang', icon: 'cloud-snow' },
    75: { desc: 'Salju Lebat', icon: 'cloud-snow' },
    95: { desc: 'Badai Petir', icon: 'cloud-lightning' },
    96: { desc: 'Badai Petir Ringan', icon: 'cloud-lightning' },
    99: { desc: 'Badai Petir Lebat', icon: 'cloud-lightning' }
};

let timeUpdateInterval;

searchBtn.addEventListener('click', () => {
    const city = cityInput.value.trim();
    if (city) {
        getWeatherData(city);
    }
});

cityInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        const city = cityInput.value.trim();
        if (city) {
            getWeatherData(city);
        }
    }
});

async function getWeatherData(city) {
    try {
        showLoading();
        hideError();
        
        // 1. Geocoding API to get coordinates and timezone
        const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${city}&count=1&language=en&format=json`);
        const geoData = await geoRes.json();
        
        if (!geoData.results || geoData.results.length === 0) {
            throw new Error('City not found');
        }
        
        const location = geoData.results[0];
        const { latitude, longitude, name, country, timezone } = location;
        
        // 2. Weather API
        const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,is_day,weather_code,wind_speed_10m,wind_gusts_10m,surface_pressure&hourly=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=${timezone || 'auto'}`);
        const weatherData = await weatherRes.json();
        
        updateUI(name, country, timezone || weatherData.timezone, weatherData);
        
    } catch (error) {
        showError();
        weatherCard.style.display = 'none';
    } finally {
        hideLoading();
    }
}

function updateUI(city, country, timezone, data) {
    const current = data.current;
    
    // Update Text Data
    cityNameEl.textContent = city;
    countryNameEl.textContent = country || '';
    tempValueEl.textContent = Math.round(current.temperature_2m);
    humidityValueEl.textContent = `${current.relative_humidity_2m}%`;
    windValueEl.textContent = `${current.wind_speed_10m} km/h`;
    
    const pressureEl = document.getElementById('pressure-value');
    if(pressureEl) pressureEl.textContent = `${Math.round(current.surface_pressure)} hPa`;
    
    const gustEl = document.getElementById('gust-value');
    if(gustEl) gustEl.textContent = `${current.wind_gusts_10m} km/h`;
    
    // Hourly Forecast (Next 5 hours)
    const hourlyEl = document.getElementById('hourly-forecast');
    if (hourlyEl && data.hourly) {
        hourlyEl.innerHTML = '';
        let startIndex = data.hourly.time.findIndex(t => new Date(t).getTime() > new Date().getTime());
        if(startIndex === -1) startIndex = 0;
        
        for (let i = startIndex; i < startIndex + 5; i++) {
            if(!data.hourly.time[i]) break;
            const hourTime = new Date(data.hourly.time[i]).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
            const hWeather = weatherCodes[data.hourly.weather_code[i]] || { icon: 'cloud' };
            const hTemp = Math.round(data.hourly.temperature_2m[i]);
            
            hourlyEl.innerHTML += `
                <div class="hourly-item">
                    <span class="hourly-time">${hourTime}</span>
                    <i data-lucide="${hWeather.icon}" class="hourly-icon"></i>
                    <span class="hourly-temp">${hTemp}°</span>
                </div>
            `;
        }
    }

    // Daily Forecast (Next 3 days)
    const dailyEl = document.getElementById('daily-forecast');
    if (dailyEl && data.daily) {
        dailyEl.innerHTML = '';
        for (let i = 1; i <= 3; i++) {
            if(!data.daily.time[i]) break;
            const dateObj = new Date(data.daily.time[i]);
            const dayName = dateObj.toLocaleDateString('id-ID', { weekday: 'long' });
            const dWeather = weatherCodes[data.daily.weather_code[i]] || { icon: 'cloud' };
            const maxT = Math.round(data.daily.temperature_2m_max[i]);
            const minT = Math.round(data.daily.temperature_2m_min[i]);
            
            dailyEl.innerHTML += `
                <div class="daily-item">
                    <span class="daily-day">${dayName}</span>
                    <i data-lucide="${dWeather.icon}" class="daily-icon"></i>
                    <div class="daily-temp-range">
                        <span class="temp-min">${minT}°</span>
                        <span class="temp-max">${maxT}°</span>
                    </div>
                </div>
            `;
        }
    }
    
    // Weather Code & Icon
    const weather = weatherCodes[current.weather_code] || { desc: 'Tidak Diketahui', icon: 'cloud' };
    let iconName = weather.icon;
    
    // Adjust icon for night if it's clear or partly cloudy
    if (current.is_day === 0) {
        if (iconName === 'sun') iconName = 'moon';
        if (iconName === 'cloud-sun') iconName = 'cloud-moon';
    }
    
    weatherDescEl.textContent = weather.desc;
    
    // Update Lucide Icon properly
    const iconContainer = document.querySelector('.weather-icon-wrapper');
    iconContainer.innerHTML = `<i data-lucide="${iconName}" id="weather-icon" class="main-icon"></i>`;
    lucide.createIcons();
    
    // Background Theme (Dynamic UI)
    if (current.is_day === 1) {
        body.classList.remove('theme-night');
        body.classList.add('theme-day');
    } else {
        body.classList.remove('theme-day');
        body.classList.add('theme-night');
    }
    
    // Start Time Updates
    updateTime(timezone);
    if (timeUpdateInterval) clearInterval(timeUpdateInterval);
    timeUpdateInterval = setInterval(() => updateTime(timezone), 1000);
    
    // Update Ticker
    const tickerTextEl = document.getElementById('ticker-text');
    if (tickerTextEl) {
        let advice = current.is_day ? "Selamat beraktivitas!" : "Selamat beristirahat!";
        if (current.weather_code >= 51 && current.weather_code <= 65) advice = "Sedia payung sebelum hujan!";
        if (current.weather_code >= 95) advice = "Harap berhati-hati dengan cuaca buruk!";
        tickerTextEl.textContent = `INFO CUACA: Saat ini cuaca di ${city} terpantau ${weather.desc.toLowerCase()} dengan suhu mencapai ${Math.round(current.temperature_2m)}°C. Kelembapan berada di angka ${current.relative_humidity_2m}% dan kecepatan angin ${current.wind_speed_10m} km/h. ${advice}`;
    }
    
    // Show Card
    weatherCard.style.display = 'block';
    setTimeout(() => {
        weatherCard.classList.add('show');
    }, 50);
}

function updateTime(timezone) {
    const now = new Date();
    
    try {
        // Format Time
        const timeOptions = { timeZone: timezone, hour: '2-digit', minute: '2-digit', hour12: false };
        const timeString = now.toLocaleTimeString('id-ID', timeOptions);
        localTimeEl.textContent = timeString.replace('.', ':');
        
        // Format Date
        const dateOptions = { timeZone: timezone, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
        localDateEl.textContent = now.toLocaleDateString('id-ID', dateOptions);
    } catch (e) {
        // Fallback if timezone is invalid
        localTimeEl.textContent = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false }).replace('.', ':');
        localDateEl.textContent = now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    }
}

function showLoading() {
    weatherCard.classList.remove('show');
    if (weatherCard.style.display === 'none' || !weatherCard.style.display) {
        loadingSpinner.style.display = 'flex';
    }
}

function hideLoading() {
    loadingSpinner.style.display = 'none';
}

function showError() {
    errorMessage.classList.add('show');
}

function hideError() {
    errorMessage.classList.remove('show');
}

// Auto cycle cities when page loads
const defaultCities = ['Jakarta', 'Tokyo', 'London', 'New York', 'Sydney', 'Paris', 'Dubai'];
let cityIndex = 0;
let autoCycleInterval;

function startAutoCycle() {
    getWeatherData(defaultCities[cityIndex]);
    
    autoCycleInterval = setInterval(() => {
        cityIndex = (cityIndex + 1) % defaultCities.length;
        getWeatherData(defaultCities[cityIndex]);
    }, 6000); // Change city every 6 seconds
}

function stopAutoCycle() {
    if (autoCycleInterval) {
        clearInterval(autoCycleInterval);
        autoCycleInterval = null;
    }
}

// Stop auto cycle when user interacts with search
searchBtn.addEventListener('click', stopAutoCycle);
cityInput.addEventListener('keypress', stopAutoCycle);
cityInput.addEventListener('focus', stopAutoCycle);

document.addEventListener('DOMContentLoaded', startAutoCycle);
