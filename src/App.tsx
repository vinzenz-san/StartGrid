import { EditModeProvider } from './contexts/EditModeContext';
import { WidgetProvider } from './contexts/WidgetContext';
import { GridConfigProvider } from './contexts/GridConfigContext';
import { BackgroundProvider } from './contexts/BackgroundContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { SettingsProvider } from './contexts/SettingsContext';
import { WeatherEffectProvider } from './contexts/WeatherEffectContext';
import Grid from './components/Layout/Grid';
import Background from './components/Background/Background';
import WeatherEffect from './components/WeatherEffect/WeatherEffect';

export default function App() {
  return (
    <SettingsProvider>
      <ThemeProvider>
        <BackgroundProvider>
          <WeatherEffectProvider>
            <EditModeProvider>
              <WidgetProvider>
                <GridConfigProvider>
                  <Background />
                  <WeatherEffect />
                  <Grid />
                </GridConfigProvider>
              </WidgetProvider>
            </EditModeProvider>
          </WeatherEffectProvider>
        </BackgroundProvider>
      </ThemeProvider>
    </SettingsProvider>
  );
}
