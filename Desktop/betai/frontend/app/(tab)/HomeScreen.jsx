// import React, { useEffect, useState, useMemo } from 'react';
// import {
//   View,
//   Text,
//   FlatList,
//   StyleSheet,
//   SafeAreaView,
//   RefreshControl,
// } from 'react-native';
// import { theme } from '../../constants/theme';
// import Ionicons from '@expo/vector-icons/Ionicons';

// // API
// import { fetchMatches, fetchMatchesByLeague } from '../../services/footballApi';

// // Components
// import SearchBar from '../../components/SearchBar';
// import TopEventsCarousel from '../../components/TopEventsCarousel';
// import LeagueHeader from '../../components/LeagueHeader';
// import MatchPredictionCard from '../../components/MatchPredictionCard';
// import { useAccessGuard } from '../../components/useAccessGuard';

// /* =========================
//    UTILS
// ========================= */
// const normalize = value =>
//   value?.toString().trim().toLowerCase() || '';

// const HomeScreen = () => {
//    useAccessGuard('full');
//   /* =========================
//      DATA STATE
//   ========================= */
//   const [matches, setMatches] = useState([]);
//   const [topEvents, setTopEvents] = useState([]);
//   const [leagues, setLeagues] = useState([]);

//   /* =========================
//      UI STATE
//   ========================= */
//   const [selectedLeague, setSelectedLeague] = useState('all');
//   const [searchQuery, setSearchQuery] = useState('');
//   const [loading, setLoading] = useState(true);
//   const [refreshing, setRefreshing] = useState(false);
//   const [rotation, setRotation] = useState(0);

//   /* =========================
//      LOADING ANIMATION
//   ========================= */
//   useEffect(() => {
//     let frame;
//     if (loading) {
//       const animate = () => {
//         setRotation(prev => (prev + 10) % 360);
//         frame = requestAnimationFrame(animate);
//       };
//       frame = requestAnimationFrame(animate);
//     }
//     return () => frame && cancelAnimationFrame(frame);
//   }, [loading]);

//   /* =========================
//      FETCH MATCHES
//   ========================= */
//   useEffect(() => {
//     setSearchQuery('');
//     loadMatches();
//   }, [selectedLeague]);

//   const loadMatches = async () => {
//     try {
//       setLoading(true);

//       const res =
//         selectedLeague === 'all'
//           ? await fetchMatches()
//           : await fetchMatchesByLeague(selectedLeague);

//      const normalizedMatches = (res.data || []).map(match => ({
//   ...match,

//   // 🔑 NORMALIZED FIELDS (USED EVERYWHERE)
//   homeTeam: match.team1?.name || '',
//   awayTeam: match.team2?.name || '',

//   league: {
//     id: match.leagueId || match.league,
//     name: match.league || '',
//     logo: match.leagueLogo,
//   },
// }));


//       setMatches(normalizedMatches);
//       setTopEvents(normalizedMatches.filter(m => m.isTopEvent));
//       setLeagues([
//         ...new Map(
//           normalizedMatches.map(m => [m.league.id, m.league])
//         ).values(),
//       ]);
//     } catch (err) {
//       console.error('Failed to load matches:', err);
//     } finally {
//       setLoading(false);
//     }
//   };

//   /* =========================
//      REFRESH
//   ========================= */
//   const onRefresh = async () => {
//     setRefreshing(true);
//     await loadMatches();
//     setRefreshing(false);
//   };

//   /* =========================
//      SEARCH FILTER
//   ========================= */
//   const filteredMatches = useMemo(() => {
//     if (!searchQuery.trim()) return matches;

//     const q = normalize(searchQuery);

//     return matches.filter(match => {
//       const home = normalize(match.homeTeam);
//       const away = normalize(match.awayTeam);
//       const league = normalize(match.league?.name);

//       return (
//         home.includes(q) ||
//         away.includes(q) ||
//         league.includes(q)
//       );
//     });
//   }, [matches, searchQuery]);

//   /* =========================
//      LOADING STATE
//   ========================= */
//   if (loading) {
//     return (
//       <SafeAreaView style={styles.container}>
//         <View style={styles.loadingContainer}>
//           <View
//             style={[
//               styles.loadingSpinner,
//               { transform: [{ rotate: `${rotation}deg` }] },
//             ]}
//           >
//             <Ionicons
//               name="football"
//               size={60}
//               color={theme.colors.accent}
//             />
//           </View>
//           <Text style={styles.loadingText}>
//             AI is analyzing matches...
//           </Text>
//           <Text style={styles.loadingSubtext}>
//             Loading predictions and insights
//           </Text>
//         </View>
//       </SafeAreaView>
//     );
//   }

//   /* =========================
//      RENDER
//   ========================= */
//   return (
//     <SafeAreaView style={styles.container}>

//       {/* ===== STATIC HEADER (KEYBOARD SAFE) ===== */}
//       <View>
//         <View style={styles.headerContainer}>
//           <Text style={styles.welcomeText}>Welcome to</Text>
//           <Text style={styles.appTitle}>footai Assistant</Text>
//           <Text style={styles.subtitle}>
//             AI-powered match predictions and insights
//           </Text>
//         </View>

//         <SearchBar
//           value={searchQuery}
//           onChangeText={setSearchQuery}
//           onClear={() => setSearchQuery('')}
//         />

//         {/* {searchQuery.length === 0 && (
//           <TopEventsCarousel matches={topEvents} />
//         )} */}

//         <View style={styles.sectionHeader}>
//           <Text style={styles.sectionTitle}>All Predictions</Text>
//           <Text style={styles.matchCount}>
//             {filteredMatches.length} matches
//           </Text>
//         </View>

//         <LeagueHeader
//           leagues={leagues}
//           selectedLeague={selectedLeague}
//           onSelectLeague={setSelectedLeague}
//         />
//       </View>

//       {/* ===== MATCH LIST ===== */}
//       <FlatList
//         data={filteredMatches}
//         keyExtractor={item => String(item.id)}
//         renderItem={({ item }) => (
//           <MatchPredictionCard match={item} />
//         )}
//         keyboardShouldPersistTaps="handled"
//         showsVerticalScrollIndicator={false}
//         refreshControl={
//           <RefreshControl
//             refreshing={refreshing}
//             onRefresh={onRefresh}
//             tintColor={theme.colors.accent}
//           />
//         }
//         ListEmptyComponent={
//           <Text style={styles.emptyText}>
//             No matches found
//           </Text>
//         }
//         contentContainerStyle={styles.listContent}
//       />
//     </SafeAreaView>
//   );
// };

// /* =========================
//    STYLES
// ========================= */
// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: theme.colors.background,
//   },
//   listContent: {
//     paddingBottom: theme.spacing.xxl,
//   },
//   headerContainer: {
//     paddingHorizontal: theme.spacing.lg,
//     paddingTop: theme.spacing.lg,
//     paddingBottom: theme.spacing.sm,
//   },
//   welcomeText: {
//     color: theme.colors.textSecondary,
//     fontSize: theme.typography.body.fontSize,
//   },
//   appTitle: {
//     color: theme.colors.textPrimary,
//     fontSize: 32,
//     fontWeight: '800',
//   },
//   subtitle: {
//     color: theme.colors.textSecondary,
//     fontSize: theme.typography.body.fontSize,
//   },
//   sectionHeader: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     paddingHorizontal: theme.spacing.lg,
//     marginTop: theme.spacing.xl,
//     marginBottom: theme.spacing.md,
//   },
//   sectionTitle: {
//     color: theme.colors.textPrimary,
//     fontSize: theme.typography.title.fontSize,
//     fontWeight: '700',
//   },
//   matchCount: {
//     color: theme.colors.textSecondary,
//     fontSize: theme.typography.body.fontSize,
//     backgroundColor: theme.colors.cardElevated,
//     paddingHorizontal: theme.spacing.sm,
//     paddingVertical: 4,
//     borderRadius: theme.borderRadius.sm,
//   },
//   loadingContainer: {
//     flex: 1,
//     alignItems: 'center',
//     justifyContent: 'center',
//   },
//   loadingSpinner: {
//     width: 100,
//     height: 100,
//     borderRadius: 50,
//     backgroundColor: theme.colors.cardBackground,
//     alignItems: 'center',
//     justifyContent: 'center',
//     marginBottom: theme.spacing.lg,
//     ...theme.shadows.medium,
//   },
//   loadingText: {
//     color: theme.colors.textSecondary,
//     fontSize: theme.typography.title.fontSize,
//     fontWeight: '600',
//   },
//   loadingSubtext: {
//     color: theme.colors.textMuted,
//     fontSize: theme.typography.body.fontSize,
//     textAlign: 'center',
//   },
//   emptyText: {
//     textAlign: 'center',
//     color: theme.colors.textMuted,
//     marginTop: theme.spacing.xl,
//   },
// });

// export default HomeScreen;


import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  SafeAreaView,
  RefreshControl,
  StatusBar,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { theme } from '../../constants/theme';
import Ionicons from '@expo/vector-icons/Ionicons';

// API
import { fetchMatches, fetchMatchesByLeague } from '../../services/footballApi';

// Components
import SearchBar from '../../components/SearchBar';
import LeagueHeader from '../../components/LeagueHeader';
import MatchPredictionCard from '../../components/MatchPredictionCard';
import { useAccessGuard } from '../../components/useAccessGuard';

/* =========================
   UTILS
========================= */
const normalize = value =>
  value?.toString().trim().toLowerCase() || '';

const HomeScreen = () => {
  useAccessGuard('full');
  
  /* =========================
     DATA STATE
  ========================= */
  const [matches, setMatches] = useState([]);
  const [leagues, setLeagues] = useState([]);

  /* =========================
     UI STATE
  ========================= */
  const [selectedLeague, setSelectedLeague] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);

  /* =========================
     LOADING ANIMATION
  ========================= */
  useEffect(() => {
    let frame;
    if (loading) {
      const animate = () => {
        setRotation(prev => (prev + 10) % 360);
        frame = requestAnimationFrame(animate);
      };
      frame = requestAnimationFrame(animate);
    }
    return () => frame && cancelAnimationFrame(frame);
  }, [loading]);

  /* =========================
     FETCH MATCHES
  ========================= */
  useEffect(() => {
    setSearchQuery('');
    loadMatches();
  }, [selectedLeague]);

  const loadMatches = async () => {
    try {
      setLoading(true);

      const res =
        selectedLeague === 'all'
          ? await fetchMatches()
          : await fetchMatchesByLeague(selectedLeague);

      const normalizedMatches = (res.data || []).map(match => ({
        ...match,
        homeTeam: match.team1?.name || '',
        awayTeam: match.team2?.name || '',
        league: {
          id: match.leagueId || match.league,
          name: match.league || '',
          logo: match.leagueLogo,
        },
      }));

      setMatches(normalizedMatches);
      setLeagues([
        ...new Map(
          normalizedMatches.map(m => [m.league.id, m.league])
        ).values(),
      ]);
    } catch (err) {
      console.error('Failed to load matches:', err);
    } finally {
      setLoading(false);
    }
  };

  /* =========================
     REFRESH
  ========================= */
  const onRefresh = async () => {
    setRefreshing(true);
    await loadMatches();
    setRefreshing(false);
  };

  /* =========================
     SEARCH FILTER
  ========================= */
  const filteredMatches = useMemo(() => {
    if (!searchQuery.trim()) return matches;

    const q = normalize(searchQuery);

    return matches.filter(match => {
      const home = normalize(match.homeTeam);
      const away = normalize(match.awayTeam);
      const league = normalize(match.league?.name);

      return (
        home.includes(q) ||
        away.includes(q) ||
        league.includes(q)
      );
    });
  }, [matches, searchQuery]);

  /* =========================
     LOADING STATE
  ========================= */
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View style={styles.loadingContainer}>
          <View
            style={[
              styles.loadingSpinner,
              { transform: [{ rotate: `${rotation}deg` }] },
            ]}
          >
            <Ionicons
              name="football"
              size={60}
              color={theme.colors.accent}
            />
          </View>
          <Text style={styles.loadingText}>
            AI is analyzing matches...
          </Text>
          <Text style={styles.loadingSubtext}>
            Loading predictions and insights
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  /* =========================
     RENDER
  ========================= */
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Fixed Header */}
      <View style={styles.header}>
        {/* Minimal header with title and search */}
        <View style={styles.headerTop}>
          <Text style={styles.appTitle}>footai</Text>
          <SearchBar
            value={searchQuery}
            onChangeText={setSearchQuery}
            onClear={() => {
              setSearchQuery('');
              setIsSearchExpanded(false);
            }}
            isExpanded={isSearchExpanded}
            onToggleExpand={setIsSearchExpanded}
          />
        </View>

        {/* League Header - only show when not searching */}
        {!isSearchExpanded && (
          <LeagueHeader
            leagues={leagues}
            selectedLeague={selectedLeague}
            onSelectLeague={setSelectedLeague}
          />
        )}
      </View>

      {/* Match List */}
      <FlatList
        data={filteredMatches}
        keyExtractor={item => String(item.id)}
        renderItem={({ item }) => (
          <MatchPredictionCard match={item} />
        )}
        ListHeaderComponent={() => (
          !isSearchExpanded ? (
            <View style={styles.listHeader}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Predictions</Text>
                <Text style={styles.matchCount}>
                  {filteredMatches.length} matches
                </Text>
              </View>
              {searchQuery ? (
                <Text style={styles.searchResultsText}>
                  Search results for "{searchQuery}"
                </Text>
              ) : null}
            </View>
          ) : null
        )}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.accent}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons
              name="search-outline"
              size={60}
              color={theme.colors.textMuted}
              style={styles.emptyIcon}
            />
            <Text style={styles.emptyText}>
              {searchQuery 
                ? `No matches found for "${searchQuery}"`
                : 'No matches available'
              }
            </Text>
            {searchQuery && (
              <TouchableOpacity
                style={styles.clearSearchButton}
                onPress={() => {
                  setSearchQuery('');
                  setIsSearchExpanded(false);
                }}
              >
                <Text style={styles.clearSearchText}>Clear Search</Text>
              </TouchableOpacity>
            )}
          </View>
        }
        contentContainerStyle={styles.listContent}
      />
    </SafeAreaView>
  );
};

/* =========================
   STYLES
========================= */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    backgroundColor: theme.colors.background,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.cardElevated,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
  },
  appTitle: {
    color: theme.colors.accent,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  listHeader: {
    backgroundColor: theme.colors.background,
    paddingBottom: theme.spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.title.fontSize,
    fontWeight: '700',
  },
  matchCount: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.body.fontSize,
    backgroundColor: theme.colors.cardElevated,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
  },
  searchResultsText: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.body.fontSize,
    textAlign: 'center',
    marginBottom: theme.spacing.md,
    fontStyle: 'italic',
  },
  listContent: {
    paddingBottom: theme.spacing.xxl,
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingSpinner: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: theme.colors.cardBackground,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.lg,
    ...theme.shadows.medium,
  },
  loadingText: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.title.fontSize,
    fontWeight: '600',
  },
  loadingSubtext: {
    color: theme.colors.textMuted,
    fontSize: theme.typography.body.fontSize,
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.xxl,
    paddingHorizontal: theme.spacing.xl,
    minHeight: 300,
  },
  emptyIcon: {
    marginBottom: theme.spacing.lg,
    opacity: 0.5,
  },
  emptyText: {
    color: theme.colors.textMuted,
    fontSize: theme.typography.body.fontSize,
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
  },
  clearSearchButton: {
    backgroundColor: theme.colors.cardBackground,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    ...theme.shadows.small,
  },
  clearSearchText: {
    color: theme.colors.accent,
    fontSize: theme.typography.body.fontSize,
    fontWeight: '600',
  },
});

export default HomeScreen;