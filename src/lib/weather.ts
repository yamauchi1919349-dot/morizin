export type CurrentLocationWeather = {
  icon: string;
  name: string;
  currentTemperature: number | null;
  maxTemperature: number | null;
  minTemperature: number | null;
  precipitationProbability: number | null;
  weatherCode: number | null;
};

export const emptyWeather: CurrentLocationWeather = {
  icon: "",
  name: "",
  currentTemperature: null,
  maxTemperature: null,
  minTemperature: null,
  precipitationProbability: null,
  weatherCode: null,
};

export function weatherCodeToIcon(code: number | null | undefined) {
  if (code === null || code === undefined) return "❔";
  if (code === 0) return "☀️";
  if (code === 1) return "🌤";
  if (code === 2) return "⛅";
  if (code === 3) return "☁️";
  if (code === 45 || code === 48) return "🌫";
  if (code >= 61 && code <= 65) return "🌧";
  if (code >= 51 && code <= 67) return "🌦";
  if (code >= 71 && code <= 77) return "❄️";
  if (code >= 80 && code <= 82) return "🌦";
  if (code >= 95 && code <= 99) return "⛈";
  return "❔";
}

export function weatherCodeToName(code: number | null | undefined) {
  if (code === null || code === undefined) return "不明";
  if (code === 0) return "晴れ";
  if (code === 1) return "晴れ時々曇り";
  if (code === 2) return "一部曇り";
  if (code === 3) return "曇り";
  if (code === 45 || code === 48) return "霧";
  if (code >= 61 && code <= 65) return "雨";
  if (code >= 51 && code <= 67) return "小雨";
  if (code >= 71 && code <= 77) return "雪";
  if (code >= 80 && code <= 82) return "にわか雨";
  if (code >= 95 && code <= 99) return "雷雨";
  return "不明";
}

export function formatTemperature(value: number | null) {
  return value === null ? "--" : Math.round(value).toString();
}

export function formatDashboardWeatherLine(weather: CurrentLocationWeather) {
  if (weather.currentTemperature === null) {
    return "--℃ | ↑-- ↓-- | ☔--";
  }

  return `${weather.icon} ${formatTemperature(weather.currentTemperature)}℃ | ↑${formatTemperature(weather.maxTemperature)}℃ ↓${formatTemperature(weather.minTemperature)}℃ | ☔${weather.precipitationProbability ?? "--"}%`;
}

export function createOpenMeteoForecastUrl(latitude: number, longitude: number) {
  const params = new URLSearchParams({
    latitude: latitude.toString(),
    longitude: longitude.toString(),
    current: "temperature_2m,weather_code",
    daily: "temperature_2m_max,temperature_2m_min,precipitation_probability_max",
    timezone: "auto",
    forecast_days: "1",
  });

  return `https://api.open-meteo.com/v1/forecast?${params.toString()}`;
}

function getCurrentPosition() {
  return new Promise<GeolocationPosition>((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("Geolocation is not available."));
      return;
    }

    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: false,
      maximumAge: 1000 * 60 * 30,
      timeout: 10000,
    });
  });
}

export async function fetchWeatherByCoordinates(latitude: number, longitude: number): Promise<CurrentLocationWeather> {
  const response = await fetch(createOpenMeteoForecastUrl(latitude, longitude));

  if (!response.ok) {
    throw new Error(`Open-Meteo request failed: ${response.status}`);
  }

  const data = (await response.json()) as {
    current?: {
      temperature_2m?: number;
      weather_code?: number;
    };
    daily?: {
      temperature_2m_max?: number[];
      temperature_2m_min?: number[];
      precipitation_probability_max?: number[];
    };
  };
  const weatherCode = data.current?.weather_code ?? null;

  return {
    icon: weatherCodeToIcon(weatherCode),
    name: weatherCodeToName(weatherCode),
    currentTemperature: data.current?.temperature_2m ?? null,
    maxTemperature: data.daily?.temperature_2m_max?.[0] ?? null,
    minTemperature: data.daily?.temperature_2m_min?.[0] ?? null,
    precipitationProbability: data.daily?.precipitation_probability_max?.[0] ?? null,
    weatherCode,
  };
}

export async function fetchCurrentLocationWeather() {
  const position = await getCurrentPosition();
  return fetchWeatherByCoordinates(position.coords.latitude, position.coords.longitude);
}
