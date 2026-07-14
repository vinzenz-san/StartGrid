import { EditModeProvider } from './contexts/EditModeContext';
import { WidgetProvider } from './contexts/WidgetContext';
import { BackgroundProvider } from './contexts/BackgroundContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { SettingsProvider } from './contexts/SettingsContext';
import Grid from './components/Layout/Grid';
import Background from './components/Background/Background';

export default function App() {
  return (
    <BackgroundProvider>
      <SettingsProvider>
        <ThemeProvider>
          <EditModeProvider>
            <WidgetProvider>
              <Background />
              <Grid />
            </WidgetProvider>
          </EditModeProvider>
        </ThemeProvider>
      </SettingsProvider>
    </BackgroundProvider>
  );
}
