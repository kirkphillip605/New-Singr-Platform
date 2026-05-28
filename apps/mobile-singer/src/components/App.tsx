import { useState } from 'react';
import { 
  App as F7App, 
  Views, 
  View, 
  Toolbar, 
  Link
} from 'framework7-react';
import { MapPin, Search, Star, History, User } from 'lucide-react';

// Import pages
import HomeView from '../pages/Home';
import CatalogView from '../pages/Catalog';
import FavoritesView from '../pages/Favorites';
import HistoryView from '../pages/History';
import ProfileView from '../pages/Profile';

export default function App() {
  const [activeTab, setActiveTab] = useState('home');

  const f7params = {
    name: 'Singr App',
    theme: 'auto',
    colors: {
      primary: '#FF5722'
    }
  };

  return (
    <F7App {...f7params}>
      <Views tabs className="safe-areas">
        {/* Tabbar Navigation */}
        <Toolbar tabbar icons bottom className="glass-panel border-x-0 border-b-0 rounded-none bg-[var(--singr-bg-secondary)]/10 backdrop-blur-xl">
          <Link 
            tabLink="#view-home" 
            tabLinkActive 
            onClick={() => setActiveTab('home')}
            className={`flex flex-col gap-1 items-center justify-center p-2 ${activeTab === 'home' ? 'text-[var(--singr-accent-primary)]' : 'text-[var(--singr-text-secondary)]'}`}
          >
            <MapPin className="w-5 h-5" />
            <span className="text-[10px] font-medium font-sans">Nearby</span>
          </Link>
          
          <Link 
            tabLink="#view-catalog" 
            onClick={() => setActiveTab('catalog')}
            className={`flex flex-col gap-1 items-center justify-center p-2 ${activeTab === 'catalog' ? 'text-[var(--singr-accent-primary)]' : 'text-[var(--singr-text-secondary)]'}`}
          >
            <Search className="w-5 h-5" />
            <span className="text-[10px] font-medium font-sans">Songbook</span>
          </Link>
          
          <Link 
            tabLink="#view-favorites" 
            onClick={() => setActiveTab('favorites')}
            className={`flex flex-col gap-1 items-center justify-center p-2 ${activeTab === 'favorites' ? 'text-[var(--singr-accent-primary)]' : 'text-[var(--singr-text-secondary)]'}`}
          >
            <Star className="w-5 h-5" />
            <span className="text-[10px] font-medium font-sans">Favorites</span>
          </Link>

          <Link 
            tabLink="#view-history" 
            onClick={() => setActiveTab('history')}
            className={`flex flex-col gap-1 items-center justify-center p-2 ${activeTab === 'history' ? 'text-[var(--singr-accent-primary)]' : 'text-[var(--singr-text-secondary)]'}`}
          >
            <History className="w-5 h-5" />
            <span className="text-[10px] font-medium font-sans">History</span>
          </Link>

          <Link 
            tabLink="#view-profile" 
            onClick={() => setActiveTab('profile')}
            className={`flex flex-col gap-1 items-center justify-center p-2 ${activeTab === 'profile' ? 'text-[var(--singr-accent-primary)]' : 'text-[var(--singr-text-secondary)]'}`}
          >
            <User className="w-5 h-5" />
            <span className="text-[10px] font-medium font-sans">Profile</span>
          </Link>
        </Toolbar>

        {/* Tab views */}
        <View id="view-home" main tab tabActive>
          <HomeView />
        </View>

        <View id="view-catalog" tab>
          <CatalogView />
        </View>

        <View id="view-favorites" tab>
          <FavoritesView />
        </View>

        <View id="view-history" tab>
          <HistoryView />
        </View>

        <View id="view-profile" tab>
          <ProfileView />
        </View>
      </Views>
    </F7App>
  );
}
