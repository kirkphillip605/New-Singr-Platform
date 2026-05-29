import ShowsPage from '../pages/Shows';
import SearchPage from '../pages/Search';
import FavoritesPage from '../pages/Favorites';
import LivePage from '../pages/Live';

const routes = [
  {
    path: '/',
    redirect: '/shows/',
  },
  {
    path: '/shows/',
    component: ShowsPage,
  },
  {
    path: '/search/',
    component: SearchPage,
  },
  {
    path: '/favorites/',
    component: FavoritesPage,
  },
  {
    path: '/live/',
    component: LivePage,
  },
];

export default routes;
