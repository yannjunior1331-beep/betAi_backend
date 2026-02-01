// app/profile.jsx - Updated with French content and clean modals
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Image,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Linking,
  Modal,
} from 'react-native';
import { theme } from '../../constants/theme';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuth } from '../../contexts/authContext';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import '../../utils/i18n';

const ProfileScreen = () => {
  const router = useRouter();
  const { 
    user, 
    betslips, 
    logout, 
    loading: authLoading, 
    isAuthenticated,
    updateBetslips 
  } = useAuth();
  
  const { t, i18n } = useTranslation();
  
  const [isPro, setIsPro] = useState(false);
  const [isAffiliate, setIsAffiliate] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(true);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedBetslip, setExpandedBetslip] = useState(null);
  const [selectedBetslipForDelete, setSelectedBetslipForDelete] = useState(null);
  const [activeSupportModal, setActiveSupportModal] = useState(null);

  // Get language state from i18n
  const isFrench = i18n.language === 'fr';

  // Initialize with user data
  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated) {
        // Redirect to login if not authenticated
        Alert.alert('Authentification requise', 'Veuillez vous connecter pour accéder à votre profil.', [
          {
            text: 'Annuler',
            style: 'cancel',
            onPress: () => router.back(),
          },
          {
            text: 'Se connecter',
            onPress: () => router.push('/auth/login'),
          },
        ]);
      } else {
        loadUserData();
      }
    }
  }, [authLoading, isAuthenticated]);

  const loadUserData = async () => {
    try {
      // Set Pro/Affiliate status from user data
      if (user) {
        setIsPro(user.subscription === 'pro' || user.isPro === true);
        setIsAffiliate(!!user.promoCode || user.isAffiliate === true);
      }
      setLoading(false);
    } catch (error) {
      console.error('Failed to load user data:', error);
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadUserData();
    setRefreshing(false);
  };

  const handleLogout = async () => {
     await logout();
     router.replace('/(auth)/login');
  };

  const handleBuyCoins = () => {
    // Redirect to paywall screen
    router.push('/paywall');
  };

  const handleBecomeAffiliate = () => {
    // Check if user already has a promo code (already an affiliate)
    if (user?.promoCode || user?.isAffiliate) {
      // User is already an affiliate - redirect directly to dashboard
      router.push('/affiliate/dashboard');
    } else {
      // User doesn't have a promo code - redirect to affiliate registration
      router.push('/affiliate/register');
    }
  };

  const handleLanguageToggle = () => {
    const newLanguage = i18n.language === 'en' ? 'fr' : 'en';
    i18n.changeLanguage(newLanguage).then(() => {
      Alert.alert(
        'Langue modifiée',
        `Langue définie sur ${newLanguage === 'fr' ? 'Français' : 'Anglais'}`
      );
    });
  };

  const handleSavedBetslipPress = (betslipId) => {
    if (expandedBetslip === betslipId) {
      setExpandedBetslip(null);
      setSelectedBetslipForDelete(null);
    } else {
      setExpandedBetslip(betslipId);
      setSelectedBetslipForDelete(betslipId);
    }
  };

  const handleNavigateToBetslip = () => {
    router.push('/betslip');
  };

  const handleRemoveBetslip = () => {
    if (!selectedBetslipForDelete) return;
    
    Alert.alert(
      'Supprimer le pari',
      'Êtes-vous sûr de vouloir supprimer ce pari ?',
      [
        {
          text: 'Annuler',
          style: 'cancel',
        },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => {
            const updatedBetslips = betslips.filter(b => b._id !== selectedBetslipForDelete && b.id !== selectedBetslipForDelete);
            updateBetslips(updatedBetslips);
            setExpandedBetslip(null);
            setSelectedBetslipForDelete(null);
            Alert.alert('Supprimé', 'Le pari a été supprimé avec succès.');
          },
        },
      ]
    );
  };

  // Support option handlers
  const handleSupportOption = (option) => {
    setActiveSupportModal(option);
  };

  const closeSupportModal = () => {
    setActiveSupportModal(null);
  };

  // Get subscription display value
  const getSubscriptionDisplay = () => {
    if (!user?.subscription) return 'Aucun';
    
    const subscription = user.subscription.toLowerCase();
    
    if (subscription === 'none') return 'Aucun';
    if (subscription === 'daily') return 'Jour';
    if (subscription === 'weekly') return 'Hebdo';
    if (subscription === 'monthly') return 'Mois';
    if (subscription === 'pro') return 'PRO';
    
    return subscription.charAt(0).toUpperCase() + subscription.slice(1);
  };

  // Calculate user stats from real betslip data
  const calculateUserStats = () => {
    const userBetslips = betslips || [];
    
    const successfulBetslips = userBetslips.filter(b => b.status === 'won' || b.status === 'success').length;
    const totalBetslips = userBetslips.length;
    const successRate = totalBetslips > 0 ? Math.round((successfulBetslips / totalBetslips) * 100) : 0;
    
    const totalWinnings = userBetslips
      .filter(b => b.status === 'won')
      .reduce((sum, b) => sum + (b.potentialWinnings || 0), 0);
    
    const accuratePredictions = userBetslips.filter(b => b.accuracy === 'high' || b.accuracy >= 70).length;
    const accuracy = totalBetslips > 0 ? Math.round((accuratePredictions / totalBetslips) * 100) : 0;

    return {
      totalBetslips,
      successfulBetslips,
      successRate: `${successRate}%`,
      totalWinnings: `${totalWinnings.toFixed(2)}`,
      accuracy: `${accuracy}%`,
      userCredits: user?.credits || 0,
      subscription: getSubscriptionDisplay()
    };
  };

  const userStats = calculateUserStats();

  // Get confidence color function
  const getConfidenceColor = (confidence) => {
    if (!confidence) return theme.colors.lowProbability;
    if (confidence >= 80) return theme.colors.highProbability;
    if (confidence >= 60) return theme.colors.mediumProbability;
    return theme.colors.lowProbability;
  };

  // Get subscription color based on type
  const getSubscriptionColor = () => {
    if (!user?.subscription || user.subscription === 'none') return theme.colors.textSecondary;
    if (user.subscription === 'pro') return theme.colors.highProbability;
    return theme.colors.mediumProbability;
  };

  // Format betslips for display
  const formatSavedBetslips = () => {
    return (betslips || []).map(betslip => {
      let selections = [];
      if (betslip.selections && Array.isArray(betslip.selections)) {
        selections = betslip.selections;
      } else if (betslip.matches && Array.isArray(betslip.matches)) {
        selections = betslip.matches.map(match => ({
          matchId: match.fixtureId,
          homeTeam: match.homeTeam,
          awayTeam: match.awayTeam,
          team1: match.homeTeam || match.team1 || 'Domicile',
          team2: match.awayTeam || match.team2 || 'Extérieur',
          pick: match.pick,
          prediction: match.pick,
          predictionType: match.predictionType || match.pick,
          predictionValue: match.predictionValue,
          fullPrediction: match.fullPrediction || 
            (match.pick && match.predictionValue ? 
              `${match.pick} ${match.predictionValue}` : 
              match.pick || 'Pas de prédiction'),
          odd: match.odd,
          status: match.status,
          league: match.league || 'Ligue inconnue',
          confidence: match.confidence || 70,
          matchTime: match.matchTime || 'À définir',
          source: match.source || 'ai'
        }));
      }
      
      const selectionsCount = selections.length;
      
      let dateString = 'Récemment';
      if (betslip.createdAt) {
        try {
          const date = new Date(betslip.createdAt);
          dateString = date.toLocaleDateString('fr-FR');
        } catch (e) {
          dateString = 'Récemment';
        }
      }
      
      const stake = betslip.stake || 10;
      const totalOdds = betslip.totalOdds || betslip.totalOdd || 1.0;
      const potentialReturn = stake * totalOdds;
      
      return {
        id: betslip._id || betslip.id || Math.random().toString(),
        title: betslip.title || `Pari #${Math.floor(Math.random() * 1000)}`,
        totalOdds: totalOdds,
        selectionsCount: selectionsCount,
        date: dateString,
        status: betslip.status || 'en attente',
        potentialReturn: betslip.potentialReturn || potentialReturn,
        selections: selections,
        stake: stake,
        potentialWin: betslip.potentialWin || potentialReturn,
        source: betslip.source || 'ai',
        createdAt: betslip.createdAt,
        aiConfidence: betslip.aiConfidence || 70,
        successRate: betslip.successRate || 0,
        original: betslip
      };
    });
  };

  const savedBetslips = formatSavedBetslips();

  // Render a selection item for expanded view
  const renderSelectionItem = (selection, index) => {
    if (!selection) return null;
    
    const league = selection.league || selection.competition || 'Ligue inconnue';
    const team1 = selection.team1 || selection.homeTeam || 'Domicile';
    const team2 = selection.team2 || selection.awayTeam || 'Extérieur';
    const odd = selection.odd || 1.5;
    const confidence = selection.confidence || 70;
    const matchTime = selection.matchTime || 'À définir';
    const status = selection.status || 'À VENIR';
    
    const getFullPrediction = () => {
      if (selection.fullPrediction) {
        return selection.fullPrediction;
      }
      
      if (selection.predictionType && selection.predictionValue) {
        const type = selection.predictionType.toUpperCase();
        const value = selection.predictionValue;
        
        switch(type) {
          case 'OVER':
            return `Over ${value}`;
          case 'UNDER':
            return `Under ${value}`;
          case 'BTTS':
            return `BTTS ${value === 'yes' ? 'Oui' : 'Non'}`;
          case '1X2':
            if (value === '1') return 'Victoire à domicile';
            if (value === '2') return 'Victoire à l\'extérieur';
            if (value === 'X') return 'Match nul';
            return `${value}`;
          case 'DC':
            return `Double chance: ${value}`;
          case '1':
            return 'Victoire à domicile';
          case 'X':
            return 'Match nul';
          case '2':
            return 'Victoire à l\'extérieur';
          default:
            return type;
        }
      }
      
      if (selection.pick) {
        if (selection.pick.includes('OVER') && !selection.pick.includes(' ')) {
          const value = selection.pick.replace('OVER', '');
          return value ? `Over ${value}` : 'Over';
        }
        if (selection.pick.includes('UNDER') && !selection.pick.includes(' ')) {
          const value = selection.pick.replace('UNDER', '');
          return value ? `Under ${value}` : 'Under';
        }
        return selection.pick;
      }
      
      return selection.prediction || 'Pas de prédiction';
    };
    
    const prediction = getFullPrediction();
    
    return (
      <View key={index} style={styles.selectionItem}>
        <View style={styles.selectionHeader}>
          <View style={styles.selectionHeaderLeft}>
            <Text style={styles.selectionLeague}>{league}</Text>
            <View style={[
              styles.statusBadge,
              { 
                backgroundColor: 
                  status === 'LIVE' ? theme.colors.liveStatus :
                  status === 'UPCOMING' ? theme.colors.upcomingStatus :
                  theme.colors.finishedStatus
              }
            ]}>
              <Text style={styles.statusText}>{status}</Text>
            </View>
          </View>
          <View style={styles.oddBadge}>
            <Text style={styles.oddText}>{parseFloat(odd).toFixed(2)}</Text>
          </View>
        </View>
        
        <Text style={styles.selectionTeams}>
          {team1} vs {team2}
        </Text>
        
        <View style={styles.selectionDetails}>
          <View style={styles.predictionContainer}>
            <Text style={styles.detailLabel}>Prédiction</Text>
            <Text style={styles.predictionText}>{prediction}</Text>
          </View>
          
          <View style={styles.confidenceContainer}>
            <Text style={styles.detailLabel}>Confiance IA:</Text>
            <View style={styles.confidenceBadge}>
              <Ionicons name="trending-up" size={10} color={getConfidenceColor(confidence)} />
              <Text style={[styles.confidenceText, { color: getConfidenceColor(confidence) }]}>
                {confidence}%
              </Text>
            </View>
          </View>
        </View>
        
        <View style={styles.selectionFooter}>
          <Text style={styles.matchTime}>{matchTime}</Text>
          <Text style={styles.selectionSource}>
            {selection.source === 'ai' ? 'Généré par IA' : 'Manuel'}
          </Text>
        </View>
      </View>
    );
  };

  // Render Support Modal
  const renderSupportModal = () => {
    if (!activeSupportModal) return null;

    const getModalContent = () => {
      switch(activeSupportModal) {
        case 'Aide & Support':
          return {
            title: 'Aide & Support',
            icon: 'help-circle',
            content: (
              <View style={styles.modalContent}>
                <Text style={styles.modalDescription}>
                  Notre équipe de support est disponible pour vous aider avec toutes vos questions concernant l'application BetAI, les paris générés, les comptes, les paiements ou toute autre préoccupation.
                </Text>
                
                <View style={styles.infoSection}>
                  <Text style={styles.infoTitle}>📧 Contact par email</Text>
                  <Text style={styles.infoText}>
                    Pour toute assistance, veuillez nous contacter à l'adresse suivante :
                  </Text>
                  <Text style={styles.emailText}>freecoder21@gmail.com</Text>
                  <Text style={styles.infoNote}>
                    Nous nous efforçons de répondre dans les 24 heures ouvrables.
                  </Text>
                </View>
                
                <View style={styles.infoSection}>
                  <Text style={styles.infoTitle}>📋 Questions fréquentes</Text>
                  <Text style={styles.infoText}>
                    • Comment fonctionne l'IA BetAI ?
                  </Text>
                  <Text style={styles.infoText}>
                    • Comment recharger mes crédits ?
                  </Text>
                  <Text style={styles.infoText}>
                    • Comment devenir affilié ?
                  </Text>
                  <Text style={styles.infoText}>
                    • Comment supprimer mon compte ?
                  </Text>
                </View>
                
                <Text style={styles.modalFooterText}>
                  Nous apprécions vos commentaires et nous nous engageons à améliorer votre expérience BetAI.
                </Text>
              </View>
            )
          };
        
        case 'Conditions d\'Utilisation':
          return {
            title: 'Conditions d\'Utilisation',
            icon: 'document-text',
            content: (
              <View style={styles.modalContent}>
                <Text style={styles.modalDescription}>
                  En utilisant BetAI, vous acceptez les conditions suivantes. Veuillez les lire attentivement.
                </Text>
                
                <View style={styles.infoSection}>
                  <Text style={styles.infoTitle}>1. Acceptation des conditions</Text>
                  <Text style={styles.infoText}>
                    En accédant et en utilisant BetAI, vous acceptez d'être lié par ces conditions d'utilisation. Si vous n'acceptez pas ces conditions, veuillez ne pas utiliser notre service.
                  </Text>
                </View>
                
                <View style={styles.infoSection}>
                  <Text style={styles.infoTitle}>2. Description du service</Text>
                  <Text style={styles.infoText}>
                    BetAI fournit des prédictions de paris sportifs générées par intelligence artificielle. Ces prédictions sont à titre informatif seulement. Les utilisateurs sont seuls responsables de leurs décisions de pari.
                  </Text>
                </View>
                
                <View style={styles.infoSection}>
                  <Text style={styles.infoTitle}>3. Responsabilités de l'utilisateur</Text>
                  <Text style={styles.infoText}>
                    Vous devez avoir l'âge légal pour parier dans votre juridiction. Les paris sportifs comportent des risques financiers. Ne pariez jamais plus que vous ne pouvez vous permettre de perdre.
                  </Text>
                </View>
                
                <View style={styles.infoSection}>
                  <Text style={styles.infoTitle}>4. Limitation de responsabilité</Text>
                  <Text style={styles.infoText}>
                    BetAI n'est pas responsable des pertes financières résultant de l'utilisation de nos prédictions. Les prédictions ne garantissent pas le succès.
                  </Text>
                </View>
                
                <Text style={styles.modalFooterText}>
                  Dernière mise à jour : Janvier 2024
                </Text>
              </View>
            )
          };
        
        case 'Politique de Confidentialité':
          return {
            title: 'Politique de Confidentialité',
            icon: 'shield-checkmark',
            content: (
              <View style={styles.modalContent}>
                <Text style={styles.modalDescription}>
                  Nous prenons votre vie privée au sérieux. Cette politique explique comment nous collectons, utilisons et protégeons vos informations.
                </Text>
                
                <View style={styles.infoSection}>
                  <Text style={styles.infoTitle}>Collecte des données</Text>
                  <Text style={styles.infoText}>
                    Nous collectons : informations de compte, données d'utilisation, préférences de pari, et informations de paiement (le cas échéant). Nous ne vendons jamais vos données personnelles.
                  </Text>
                </View>
                
                <View style={styles.infoSection}>
                  <Text style={styles.infoTitle}>Utilisation des données</Text>
                  <Text style={styles.infoText}>
                    Vos données sont utilisées pour : personnaliser vos prédictions, améliorer notre service, traiter les paiements, et communiquer avec vous concernant votre compte.
                  </Text>
                </View>
                
                <View style={styles.infoSection}>
                  <Text style={styles.infoTitle}>Sécurité des données</Text>
                  <Text style={styles.infoText}>
                    Nous utilisons le chiffrement SSL, des pare-feux et des pratiques de sécurité standard pour protéger vos informations. Vos mots de passe sont hachés et ne sont jamais stockés en clair.
                  </Text>
                </View>
                
                <View style={styles.infoSection}>
                  <Text style={styles.infoTitle}>Vos droits</Text>
                  <Text style={styles.infoText}>
                    Vous avez le droit d'accéder, de corriger ou de supprimer vos données personnelles. Contactez-nous à freecoder21@gmail.com pour exercer ces droits.
                  </Text>
                </View>
                
                <Text style={styles.modalFooterText}>
                  Nous nous engageons à protéger votre vie privée conformément au RGPD et autres réglementations applicables.
                </Text>
              </View>
            )
          };
        
        case 'À Propos de BetAI':
          return {
            title: 'À Propos de BetAI',
            icon: 'information-circle',
            content: (
              <View style={styles.modalContent}>
                <Text style={styles.modalDescription}>
                  BetAI est une plateforme révolutionnaire qui utilise l'intelligence artificielle pour générer des prédictions de paris sportifs avec une précision élevée.
                </Text>
                
                <View style={styles.infoSection}>
                  <Text style={styles.infoTitle}>Notre Mission</Text>
                  <Text style={styles.infoText}>
                    Notre mission est d'utiliser la technologie d'intelligence artificielle la plus avancée pour fournir aux parieurs sportifs des prédictions de qualité supérieure, des analyses approfondies et des outils innovants pour améliorer leur expérience de pari.
                  </Text>
                </View>
                
                <View style={styles.infoSection}>
                  <Text style={styles.infoTitle}>Notre Technologie</Text>
                  <Text style={styles.infoText}>
                    Nous utilisons des modèles d'IA de pointe qui analysent des milliers de points de données par match : statistiques historiques, forme des équipes, blessures, conditions météorologiques, et tendances du marché.
                  </Text>
                </View>
                
                <View style={styles.infoSection}>
                  <Text style={styles.infoTitle}>Notre Équipe</Text>
                  <Text style={styles.infoText}>
                    Fondé par des experts en data science et des passionnés de sports, BetAI combine l'expertise technique avec une profonde compréhension des paris sportifs.
                  </Text>
                </View>
                
                <View style={styles.infoSection}>
                  <Text style={styles.infoTitle}>Notre Engagement</Text>
                  <Text style={styles.infoText}>
                    Nous croyons en un pari responsable. Notre application inclut des outils de gestion des dépôts et des rappels pour encourager des habitudes de pari saines.
                  </Text>
                </View>
                
                <Text style={styles.modalFooterText}>
                  Rejoignez des milliers d'utilisateurs qui font déjà confiance à BetAI pour leurs décisions de pari.
                </Text>
              </View>
            )
          };
        
        default:
          return null;
      }
    };

    const modalData = getModalContent();
    if (!modalData) return null;

    return (
      <Modal
        animationType="slide"
        transparent={true}
        visible={!!activeSupportModal}
        onRequestClose={closeSupportModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleContainer}>
                <Ionicons name={modalData.icon} size={24} color={theme.colors.accent} />
                <Text style={styles.modalTitle}>{modalData.title}</Text>
              </View>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={closeSupportModal}
              >
                <Ionicons name="close" size={24} color={theme.colors.textPrimary} />
              </TouchableOpacity>
            </View>

            {/* Modal Content */}
            <ScrollView 
              style={styles.modalBody}
              showsVerticalScrollIndicator={false}
            >
              {modalData.content}
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  // Loading state
  if (authLoading || loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.accent} />
        <Text style={styles.loadingText}>Chargement du profil...</Text>
      </View>
    );
  }

  // Not authenticated state
  if (!isAuthenticated) {
    return (
      <View style={styles.authContainer}>
        <Ionicons name="person-circle" size={80} color={theme.colors.textMuted} />
        <Text style={styles.authTitle}>Authentification requise</Text>
        <Text style={styles.authText}>Veuillez vous connecter pour voir votre profil</Text>
        <TouchableOpacity 
          style={styles.authButton}
          onPress={() => router.push('/auth/login')}
        >
          <Ionicons name="log-in" size={20} color="#FFFFFF" />
          <Text style={styles.authButtonText}>Se connecter</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container} 
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={[theme.colors.accent]}
          tintColor={theme.colors.accent}
        />
      }
    >
      {/* Header Section */}
      <View style={styles.header}>
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            <Image
              source={{ 
                uri: user?.avatar || `https://ui-avatars.com/api/?name=${user?.username || 'User'}&background=${theme.colors.accent.replace('#', '')}&color=fff`
              }}
              style={styles.avatar}
            />
            {isPro && (
              <View style={styles.proBadge}>
                <Ionicons name="star" size={12} color="#FFFFFF" />
                <Text style={styles.proBadgeText}>PRO</Text>
              </View>
            )}
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{user?.username || 'Utilisateur Invité'}</Text>
            <Text style={styles.userEmail}>{user?.email || 'invité@exemple.com'}</Text>
            <View style={styles.statsRow}>
              <View style={styles.statBadge}>
                <Ionicons name="trophy" size={14} color={theme.colors.accent} />
                <Text style={styles.statBadgeText}>{userStats.successRate} Succès</Text>
              </View>
              <View style={styles.statBadge}>
                <Ionicons name="trending-up" size={14} color={theme.colors.highProbability} />
                <Text style={styles.statBadgeText}>{userStats.accuracy} Précision</Text>
              </View>
            </View>
          </View>
        </View>
      </View>

      {/* Stats Cards */}
      <View style={styles.statsSection}>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Ionicons name="receipt" size={24} color={theme.colors.accent} />
            <Text style={styles.statValue}>{userStats.totalBetslips}</Text>
            <Text style={styles.statLabel}>Paris Totaux</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="card" size={24} color={getSubscriptionColor()} />
            <Text style={[styles.statValue, { color: getSubscriptionColor() }]}>
              {userStats.subscription}
            </Text>
            <Text style={styles.statLabel}>Abonnement</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="diamond-outline" size={24} color="#F7931A" />
            <Text style={styles.statValue}>{userStats.userCredits.toFixed(0)}</Text>
            <Text style={styles.statLabel}>Crédits</Text>
          </View>
        </View>
      </View>

      {/* Create New Betslip */}
      <View style={styles.createBetslipSection}>
        <TouchableOpacity 
          style={styles.createBetslipButton}
          onPress={handleNavigateToBetslip}
        >
          <Ionicons name="add-circle" size={24} color={theme.colors.accent} />
          <View style={styles.createBetslipContent}>
            <Text style={styles.createBetslipTitle}>Créer un nouveau pari</Text>
            <Text style={styles.createBetslipText}>Générer des paris alimentés par IA</Text>
          </View>
          <Ionicons name="arrow-forward" size={20} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Saved Betslips Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleContainer}>
            <Ionicons name="bookmark" size={20} color={theme.colors.accent} />
            <Text style={styles.sectionTitle}>
              Paris Enregistrés {betslips?.length > 0 && `(${betslips.length})`}
            </Text>
          </View>
        </View>

        {savedBetslips.length > 0 ? (
          <View style={styles.savedBetslips}>
            {savedBetslips.slice(0, 3).map((betslip) => (
              <View key={betslip.id} style={styles.betslipCard}>
                {/* Betslip Header - Clickable */}
                <TouchableOpacity 
                  style={styles.betslipContent}
                  onPress={() => handleSavedBetslipPress(betslip.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.betslipInfo}>
                    <Text style={styles.betslipTitle} numberOfLines={1}>
                      {betslip.title}
                    </Text>
                    <View style={styles.betslipDetails}>
                      <View style={styles.betslipDetail}>
                        <Ionicons name="calendar" size={12} color={theme.colors.textSecondary} />
                        <Text style={styles.betslipDetailText}>{betslip.date}</Text>
                      </View>
                      <View style={styles.betslipDetail}>
                        <Ionicons name="football" size={12} color={theme.colors.textSecondary} />
                        <Text style={styles.betslipDetailText}>
                          {betslip.selectionsCount} {betslip.selectionsCount === 1 ? 'match' : 'matches'}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <View style={styles.betslipOdd}>
                    <Text style={styles.betslipOddLabel}>Cote Totale</Text>
                    <Text style={styles.betslipOddValue}>{betslip.totalOdds.toFixed(2)}</Text>
                  </View>
                  <View style={styles.betslipExpandIcon}>
                    <Ionicons 
                      name={expandedBetslip === betslip.id ? "chevron-up" : "chevron-down"} 
                      size={20} 
                      color={theme.colors.accent} 
                    />
                  </View>
                </TouchableOpacity>

                {/* Expanded Betslip Details */}
                {expandedBetslip === betslip.id && (
                  <View style={styles.expandedDetails}>
                    {/* Betslip Summary */}
                    <View style={styles.betslipSummary}>
                      <View style={styles.summaryItem}>
                        <Text style={styles.summaryLabel}>Confiance IA</Text>
                        <View style={styles.confidenceMeterContainer}>
                          <View style={styles.confidenceMeter}>
                            <View 
                              style={[
                                styles.confidenceFill, 
                                { 
                                  width: `${betslip.aiConfidence}%`,
                                  backgroundColor: getConfidenceColor(betslip.aiConfidence)
                                }
                              ]} 
                            />
                          </View>
                          <Text style={[styles.confidenceValue, { color: getConfidenceColor(betslip.aiConfidence) }]}>
                            {betslip.aiConfidence}%
                          </Text>
                        </View>
                      </View>
                      
                      <View style={styles.summaryItem}>
                        <Text style={styles.summaryLabel}>Taux de Réussite</Text>
                        <Text style={[styles.successRate, { color: getConfidenceColor(betslip.successRate) }]}>
                          {betslip.successRate}%
                        </Text>
                      </View>
                    </View>

                    {/* Potential Return Section */}
                    <View style={styles.potentialWinSection}>
                      <View style={styles.stakeBox}>
                        <Text style={styles.stakeLabel}>Mise</Text>
                        <Text style={styles.stakeAmount}>${betslip.stake?.toFixed(2) || '10.00'}</Text>
                      </View>
                      <Ionicons name="arrow-forward" size={16} color={theme.colors.textSecondary} />
                      <View style={styles.potentialBox}>
                        <Text style={styles.potentialLabel}>Gain Potentiel</Text>
                        <Text style={styles.potentialAmount}>
                          ${betslip.potentialReturn?.toFixed(2)}
                        </Text>
                      </View>
                    </View>

                    {/* Selections List */}
                    {betslip.selections && betslip.selections.length > 0 && (
                      <View style={styles.selectionsSection}>
                        <Text style={styles.selectionsTitle}>Sélections dans ce pari</Text>
                        <View style={styles.selectionsList}>
                          {betslip.selections.map((selection, index) => renderSelectionItem(selection, index))}
                        </View>
                      </View>
                    )}

                    {/* Delete Button */}
                    <TouchableOpacity 
                      style={styles.deleteButton}
                      onPress={handleRemoveBetslip}
                    >
                      <Ionicons name="trash-outline" size={18} color="#FFFFFF" />
                      <Text style={styles.deleteButtonText}>Supprimer ce pari</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyBetslips}>
            <Ionicons name="bookmark-outline" size={48} color={theme.colors.textMuted} />
            <Text style={styles.emptyBetslipsTitle}>Aucun pari enregistré</Text>
            <Text style={styles.emptyBetslipsText}>
              Créez votre premier pari et enregistrez-le pour le retrouver ici
            </Text>
            <TouchableOpacity 
              style={styles.emptyButton}
              onPress={handleNavigateToBetslip}
            >
              <Ionicons name="add" size={20} color="#FFFFFF" />
              <Text style={styles.emptyButtonText}>Créer un pari</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Account Options */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleContainer}>
            <Ionicons name="person-circle" size={20} color={theme.colors.accent} />
            <Text style={styles.sectionTitle}>Compte</Text>
          </View>
        </View>

        <View style={styles.optionsList}>
          {/* Language Toggle Option */}
          <TouchableOpacity style={styles.option} onPress={handleLanguageToggle}>
            <View style={styles.optionLeft}>
              <Ionicons name="language" size={22} color={theme.colors.textPrimary} />
              <Text style={styles.optionText}>Langue</Text>
            </View>
            <View style={styles.optionRight}>
              <View style={styles.languageToggle}>
                <Text style={styles.languageText}>{isFrench ? 'FR' : 'EN'}</Text>
                <View style={[styles.toggleSwitch, isFrench ? styles.toggleActive : null]}>
                  <View style={[styles.toggleKnob, isFrench ? styles.toggleKnobActive : null]} />
                </View>
              </View>
            </View>
          </TouchableOpacity>

          {/* Buy Coins */}
          <TouchableOpacity 
            style={styles.option}
            onPress={handleBuyCoins}
          >
            <View style={styles.optionLeft}>
              <Ionicons name="diamond-outline" size={22} color="#F7931A" />
              <Text style={styles.optionText}>Acheter des crédits</Text>
            </View>
            <View style={styles.optionRight}>
              <View style={styles.coinsBadge}>
                <Text style={styles.coinsBadgeText}>Obtenir</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.colors.textSecondary} />
            </View>
          </TouchableOpacity>

          {/* Become Affiliate */}
          <TouchableOpacity 
            style={[styles.option, isAffiliate && styles.affiliateOption]}
            onPress={handleBecomeAffiliate}
          >
            <View style={styles.optionLeft}>
              <Ionicons 
                name={isAffiliate ? "people" : "people-outline"} 
                size={22} 
                color={isAffiliate ? theme.colors.highProbability : theme.colors.textPrimary} 
              />
              <Text style={styles.optionText}>
                {isAffiliate ? 'Programme d\'affiliation' : 'Devenir affilié'}
              </Text>
            </View>
            {!isAffiliate ? (
              <View style={styles.optionRight}>
                <View style={styles.earnBadge}>
                  <Text style={styles.earnBadgeText}>Gagner</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={theme.colors.textSecondary} />
              </View>
            ) : (
              <View style={styles.affiliateActiveBadge}>
                <Text style={styles.affiliateActiveText}>Actif</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Settings */}
          <View style={styles.option}>
            <View style={styles.optionLeft}>
              <Ionicons name="notifications" size={22} color={theme.colors.textPrimary} />
              <Text style={styles.optionText}>Notifications</Text>
            </View>
            <Switch
              value={notifications}
              onValueChange={setNotifications}
              trackColor={{ false: theme.colors.border, true: theme.colors.accent }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>
      </View>

      {/* Support & Legal */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleContainer}>
            <Ionicons name="help-circle" size={20} color={theme.colors.accent} />
            <Text style={styles.sectionTitle}>Support & Légal</Text>
          </View>
        </View>

        <View style={styles.supportOptions}>
          <TouchableOpacity 
            style={styles.supportOption}
            onPress={() => handleSupportOption('Aide & Support')}
          >
            <Ionicons name="help" size={18} color={theme.colors.textSecondary} />
            <Text style={styles.supportOptionText}>Aide & Support</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.supportOption}
            onPress={() => handleSupportOption('Conditions d\'Utilisation')}
          >
            <Ionicons name="document-text" size={18} color={theme.colors.textSecondary} />
            <Text style={styles.supportOptionText}>Conditions d'Utilisation</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.supportOption}
            onPress={() => handleSupportOption('Politique de Confidentialité')}
          >
            <Ionicons name="shield-checkmark" size={18} color={theme.colors.textSecondary} />
            <Text style={styles.supportOptionText}>Politique de Confidentialité</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.supportOption}
            onPress={() => handleSupportOption('À Propos de BetAI')}
          >
            <Ionicons name="information-circle" size={18} color={theme.colors.textSecondary} />
            <Text style={styles.supportOptionText}>À Propos de BetAI</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Logout Button */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Ionicons name="log-out" size={20} color="#EF4444" />
        <Text style={styles.logoutText}>Déconnexion</Text>
      </TouchableOpacity>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.version}>Version 1.0.0</Text>
        <Text style={styles.copyright}>© 2024 BetAI. Tous droits réservés.</Text>
      </View>

      {/* Support Modal */}
      {renderSupportModal()}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.body.fontSize,
    marginTop: theme.spacing.md,
  },
  authContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  authTitle: {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.title.fontSize,
    fontWeight: '700',
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  authText: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.body.fontSize,
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
  },
  authButton: {
    backgroundColor: theme.colors.accent,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
  },
  authButtonText: {
    color: '#FFFFFF',
    fontSize: theme.typography.body.fontSize,
    fontWeight: '600',
  },
  header: {
    backgroundColor: theme.colors.cardBackground,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.xl,
    paddingBottom: theme.spacing.xl,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    ...theme.shadows.medium,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: theme.spacing.lg,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: theme.colors.accent,
  },
  proBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: theme.colors.accent,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    gap: 2,
  },
  proBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    color: theme.colors.textPrimary,
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 2,
  },
  userEmail: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    marginBottom: theme.spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  statBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.cardElevated,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statBadgeText: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: '500',
  },
  statsSection: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.xl,
    paddingBottom: theme.spacing.lg,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    alignItems: 'center',
    ...theme.shadows.small,
  },
  statValue: {
    color: theme.colors.textPrimary,
    fontSize: 20,
    fontWeight: '700',
    marginTop: 8,
    marginBottom: 2,
  },
  statLabel: {
    color: theme.colors.textSecondary,
    fontSize: 11,
  },
  createBetslipSection: {
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
  },
  createBetslipButton: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    ...theme.shadows.medium,
  },
  createBetslipContent: {
    flex: 1,
  },
  createBetslipTitle: {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.subtitle.fontSize,
    fontWeight: '600',
    marginBottom: 2,
  },
  createBetslipText: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.small.fontSize,
  },
  section: {
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.title.fontSize,
    fontWeight: '700',
  },
  savedBetslips: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    ...theme.shadows.medium,
  },
  betslipCard: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  betslipContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
  },
  betslipInfo: {
    flex: 1,
  },
  betslipTitle: {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.body.fontSize,
    fontWeight: '600',
    marginBottom: 4,
  },
  betslipDetails: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  betslipDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  betslipDetailText: {
    color: theme.colors.textSecondary,
    fontSize: 11,
  },
  betslipOdd: {
    alignItems: 'center',
    marginHorizontal: theme.spacing.md,
  },
  betslipOddLabel: {
    color: theme.colors.textSecondary,
    fontSize: 10,
    marginBottom: 2,
  },
  betslipOddValue: {
    color: theme.colors.accent,
    fontSize: 18,
    fontWeight: '700',
  },
  betslipExpandIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expandedDetails: {
    padding: theme.spacing.md,
    paddingTop: 0,
    backgroundColor: theme.colors.cardElevated,
  },
  betslipSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
  },
  summaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryLabel: {
    color: theme.colors.textSecondary,
    fontSize: 11,
    marginBottom: 4,
  },
  confidenceMeterContainer: {
    alignItems: 'center',
  },
  confidenceMeter: {
    width: 60,
    height: 6,
    backgroundColor: theme.colors.border,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 3,
  },
  confidenceFill: {
    height: '100%',
    borderRadius: 3,
  },
  confidenceValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  successRate: {
    fontSize: 15,
    fontWeight: '700',
  },
  potentialWinSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.md,
  },
  stakeBox: {
    alignItems: 'center',
    flex: 1,
  },
  stakeLabel: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    marginBottom: 4,
  },
  stakeAmount: {
    color: theme.colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  potentialBox: {
    alignItems: 'center',
    flex: 1,
  },
  potentialLabel: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    marginBottom: 4,
  },
  potentialAmount: {
    color: theme.colors.highProbability,
    fontSize: 18,
    fontWeight: '800',
  },
  selectionsSection: {
    paddingVertical: theme.spacing.md,
  },
  selectionsTitle: {
    color: theme.colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: theme.spacing.sm,
  },
  selectionsList: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
  },
  selectionItem: {
    marginBottom: theme.spacing.sm,
    paddingBottom: theme.spacing.sm,
  },
  selectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  selectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    flex: 1,
  },
  selectionLeague: {
    color: theme.colors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  oddBadge: {
    backgroundColor: theme.colors.accent,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
    minWidth: 45,
    alignItems: 'center',
  },
  oddText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  selectionTeams: {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.body.fontSize,
    fontWeight: '700',
    marginBottom: theme.spacing.sm,
  },
  selectionDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  predictionContainer: {
    flex: 1,
    marginRight: theme.spacing.sm,
  },
  detailLabel: {
    color: theme.colors.textSecondary,
    fontSize: 11,
    marginBottom: 2,
  },
  predictionText: {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.body.fontSize,
    fontWeight: '600',
  },
  confidenceContainer: {
    alignItems: 'flex-end',
  },
  confidenceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  confidenceText: {
    fontSize: 11,
    fontWeight: '600',
  },
  selectionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: theme.spacing.xs,
  },
  matchTime: {
    color: theme.colors.textSecondary,
    fontSize: 11,
  },
  selectionSource: {
    color: theme.colors.textSecondary,
    fontSize: 10,
    fontStyle: 'italic',
  },
  deleteButton: {
    backgroundColor: '#EF4444',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginTop: theme.spacing.md,
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontSize: theme.typography.body.fontSize,
    fontWeight: '600',
  },
  emptyBetslips: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.xl,
    alignItems: 'center',
    ...theme.shadows.medium,
  },
  emptyBetslipsTitle: {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.subtitle.fontSize,
    fontWeight: '600',
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  emptyBetslipsText: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.body.fontSize,
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
    lineHeight: 20,
  },
  emptyButton: {
    backgroundColor: theme.colors.accent,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontSize: theme.typography.body.fontSize,
    fontWeight: '600',
  },
  optionsList: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    ...theme.shadows.medium,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.lg,
  },
  affiliateOption: {
    backgroundColor: `${theme.colors.highProbability}10`,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    flex: 1,
  },
  optionText: {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.body.fontSize,
    fontWeight: '500',
  },
  optionRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  languageToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  languageText: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    minWidth: 20,
  },
  toggleSwitch: {
    width: 40,
    height: 20,
    backgroundColor: theme.colors.border,
    borderRadius: 10,
    padding: 2,
    justifyContent: 'center',
  },
  toggleActive: {
    backgroundColor: theme.colors.accent,
  },
  toggleKnob: {
    width: 16,
    height: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    marginLeft: 0,
  },
  toggleKnobActive: {
    marginLeft: 20,
  },
  coinsBadge: {
    backgroundColor: '#F7931A',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  coinsBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  earnBadge: {
    backgroundColor: theme.colors.highProbability,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  earnBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  affiliateActiveBadge: {
    backgroundColor: theme.colors.highProbability,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  affiliateActiveText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  supportOptions: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    ...theme.shadows.medium,
  },
  supportOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  supportOptionText: {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.body.fontSize,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    backgroundColor: `${theme.colors.lowProbability}20`,
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
  },
  logoutText: {
    color: '#EF4444',
    fontSize: theme.typography.subtitle.fontSize,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    paddingBottom: theme.spacing.xl,
    marginTop: theme.spacing.md,
  },
  version: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    marginBottom: 4,
  },
  copyright: {
    color: theme.colors.textMuted,
    fontSize: 11,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  modalContainer: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.lg,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    ...theme.shadows.xlarge,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  modalTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  modalTitle: {
    color: theme.colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  closeButton: {
    padding: 4,
  },
  modalBody: {
    maxHeight: '70%',
  },
  modalContent: {
    padding: theme.spacing.lg,
  },
  modalDescription: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.body.fontSize,
    lineHeight: 22,
    marginBottom: theme.spacing.lg,
  },
  infoSection: {
    marginBottom: theme.spacing.lg,
  },
  infoTitle: {
    color: theme.colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: theme.spacing.sm,
  },
  infoText: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.body.fontSize,
    lineHeight: 20,
    marginBottom: theme.spacing.xs,
  },
  emailText: {
    color: theme.colors.accent,
    fontSize: 16,
    fontWeight: '600',
    marginVertical: theme.spacing.sm,
  },
  infoNote: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: theme.spacing.xs,
  },
  modalFooterText: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: theme.spacing.lg,
    textAlign: 'center',
  },
});

export default ProfileScreen;