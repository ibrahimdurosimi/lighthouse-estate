import { Moon, Sun } from 'lucide-react';
import { useApp } from '../lib/context';

export default function ThemeToggle() {
    const { isDarkMode, toggleDarkMode } = useApp();

    return (
        <button
            onClick={toggleDarkMode}
            className="p-2 rounded-full bg-gray-50 dark:bg-stone-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-stone-700 transition-colors flex-shrink-0"
            aria-label="Toggle theme"
        >
            {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
    );
}
