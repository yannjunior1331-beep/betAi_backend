// app/components/BetslipCard.jsx - Updated with i18n and onSaveSuccess prop
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { theme } from '../constants/theme';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuth } from '../contexts/authContext';
import { useTranslation } from 'react-i18next';
import '../utils/i18n';

const BetslipCard = ({ betslip, index, onSaveSuccess }) => {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { isAuthenticated, saveBetslip } = useAuth();

  const getConfidenceColor = (confidence) => {
    if (confidence >= 80) return theme.colors.highProbability;
    if (confidence >= 60) return theme.colors.mediumProbability;
    return theme.colors.lowProbability;
  };

  const getSuccessRateColor = (rate) => {
    if (rate >= 70) return theme.colors.highProbability;
    if (rate >= 50) return theme.colors.mediumProbability;
    return theme.colors.lowProbability;
  };

  // Update the formatPredictionForDisplay function:
  const formatPredictionForDisplay = (selection) => {
    // If we have a full prediction text, use it
    if (selection.fullPrediction) {
      return selection.fullPrediction;
    }
    
    // If we have prediction details, construct the full text
    if (selection.predictionType && selection.predictionValue) {
      const type = selection.predictionType.toUpperCase();
      const value = selection.predictionValue;
      
      switch(type) {
        case 'OVER':
          return t('betslip.card.predictions.over', { value: value });
        case 'UNDER':
          return t('betslip.card.predictions.under', { value: value });
        case 'BTTS':
          return t('betslip.card.predictions.btts', { 
            value: value === 'yes' ? t('common.yes') : t('common.no') 
          });
        case '1X2':
          if (value === '1') return t('betslip.card.predictions.homeWin');
          if (value === '2') return t('betslip.card.predictions.awayWin');
          if (value === 'X') return t('betslip.card.predictions.draw');
          return t('betslip.card.predictions.oneXTwo', { value: value });
        case 'DC':
          return t('betslip.card.predictions.doubleChance', { value: value });
        default:
          return selection.prediction || t('betslip.card.noPrediction');
      }
    }
    
    // Fallback to just the prediction field
    return selection.prediction || t('betslip.card.noPrediction');
  };

  const handleAddToBetslip = async () => {
    if (!isAuthenticated) {
      Alert.alert(
        t('betslip.loginRequired'),
        t('betslip.loginToSave'),
        [
          {
            text: t('common.cancel'),
            style: 'cancel',
          },
          {
            text: t('betslip.goToLogin'),
            onPress: () => {
              // Add navigation to login if needed
            },
          },
        ]
      );
      return;
    }

    setIsSaving(true);
    
    try {
      // Prepare betslip data with ALL prediction information
      const betslipData = {
        title: t('betslip.card.title', { id: betslip.id.split('-')[1] || 'New' }),
        // Map selections with ALL prediction data
        selections: betslip.selections.map(selection => ({
          matchId: selection.matchId,
          league: selection.league,
          team1: selection.team1,
          team2: selection.team2,
          
          // Save ALL prediction information
          prediction: selection.prediction || t('betslip.card.noPrediction'),
          fullPrediction: formatPredictionForDisplay(selection), // Save the full formatted prediction
          predictionType: selection.predictionType, // e.g., 'OVER', 'BTTS', '1X2'
          predictionValue: selection.predictionValue, // e.g., '2.5', 'yes', '1'
          
          odd: selection.odd,
          confidence: selection.confidence,
          matchTime: selection.matchTime,
          status: selection.status,
          
          // Include any additional data that might be in the selection
          homeTeam: selection.homeTeam,
          awayTeam: selection.awayTeam,
          pick: selection.pick,
        })),
        totalOdds: betslip.totalOdd,
        stake: betslip.stake || 10,
        potentialReturn: betslip.potentialReturn,
        source: 'ai',
        aiConfidence: betslip.aiConfidence || 0,
        successRate: betslip.successRate || 0,
      };

      console.log('📤 Sending betslip data with full predictions:', betslipData);
      
      const result = await saveBetslip(betslipData);
      
      if (result.success) {
        // ✅ Call parent's notification handler for consistent web/mobile notifications
        if (onSaveSuccess) {
          onSaveSuccess(t('betslip.card.savedSuccess'));
        }
        
        // ✅ Also show native alert for mobile (it works well there)
        if (Platform.OS === 'ios' || Platform.OS === 'android') {
          Alert.alert(
            t('common.success'),
            t('betslip.card.savedSuccess'),
            [{ text: t('common.ok') }]
          );
        }
      } else {
        throw new Error(result.error || t('betslip.card.saveError'));
      }
    } catch (error) {
      console.error('Save betslip error:', error);
      
      // Show error in both ways
      if (onSaveSuccess) {
        onSaveSuccess(error.message || t('betslip.card.saveError'));
      }
      
      if (Platform.OS === 'ios' || Platform.OS === 'android') {
        Alert.alert(
          t('common.error'),
          error.message || t('betslip.card.saveError'),
          [{ text: t('common.ok') }]
        );
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleViewDetails = () => {
    setExpanded(!expanded);
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Format the betslip data for display
  const formattedBetslip = {
    ...betslip,
    timestamp: betslip.timestamp || new Date().toISOString(),
    selections: betslip.selections || [],
    totalOdd: betslip.totalOdd || 1.0,
    aiConfidence: betslip.aiConfidence || 0,
    successRate: betslip.successRate || 0,
    stake: betslip.stake || 10,
    potentialReturn: betslip.potentialReturn || 10,
    matchCount: betslip.matchCount || betslip.selections?.length || 0,
  };

  return (
    <View style={styles.container}>
      {/* Betslip Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.betslipIdContainer}>
            <Ionicons name="receipt" size={16} color={theme.colors.accent} />
            <Text style={styles.betslipId}>#{formattedBetslip.id.split('-')[1] || '000'}</Text>
          </View>
          <View style={styles.matchesCount}>
            <Ionicons name="football" size={12} color={theme.colors.textSecondary} />
            <Text style={styles.matchesCountText}>
              {formattedBetslip.matchCount} {formattedBetslip.matchCount === 1 ? t('betslip.card.match') : t('betslip.card.matches')}
            </Text>
          </View>
        </View>
        <View style={styles.timestamp}>
          <Ionicons name="time-outline" size={12} color={theme.colors.textSecondary} />
          <Text style={styles.timestampText}>{formatTime(formattedBetslip.timestamp)}</Text>
        </View>
      </View>

      {/* Selections List */}
      <View style={styles.selections}>
        {formattedBetslip.selections.slice(0, expanded ? formattedBetslip.selections.length : 1).map((selection, index) => (
          <View key={`${selection.matchId}-${index}`} style={styles.selection}>
            <View style={styles.selectionHeader}>
              <Text style={styles.league}>{selection.league}</Text>
              <View style={[
                styles.statusBadge,
                { 
                  backgroundColor: 
                    selection.status === 'LIVE' ? theme.colors.liveStatus :
                    selection.status === 'UPCOMING' ? theme.colors.upcomingStatus :
                    theme.colors.finishedStatus
                }
              ]}>
                <Text style={styles.statusText}>{selection.status}</Text>
              </View>
            </View>
            
            <Text style={styles.match} numberOfLines={1}>
              {selection.team1 || selection.homeTeam || t('profile.home')} vs {selection.team2 || selection.awayTeam || t('profile.away')}
            </Text>
            
            <View style={styles.selectionDetails}>
              <View style={styles.predictionContainer}>
                <Text style={styles.predictionLabel}>{t('betslip.card.prediction')}:</Text>
                <Text style={styles.prediction} numberOfLines={1}>
                  {formatPredictionForDisplay(selection)}
                </Text>
              </View>
              
              <View style={styles.oddContainer}>
                <Text style={styles.oddLabel}>{t('betslip.card.odd')}:</Text>
                <View style={styles.oddBadge}>
                  <Text style={styles.odd}>{parseFloat(selection.odd).toFixed(2)}</Text>
                </View>
              </View>
            </View>
            
            <View style={styles.selectionFooter}>
              <Text style={styles.matchTime}>{selection.matchTime}</Text>
              <View style={styles.confidenceBadge}>
                <Ionicons name="trending-up" size={10} color={getConfidenceColor(selection.confidence)} />
                <Text style={[styles.confidence, { color: getConfidenceColor(selection.confidence) }]}>
                  {selection.confidence}% {t('betslip.card.ai')}
                </Text>
              </View>
            </View>
          </View>
        ))}
        
        {formattedBetslip.selections.length > 1 && (
          <TouchableOpacity 
            style={styles.expandButton}
            onPress={() => setExpanded(!expanded)}
          >
            <Text style={styles.expandButtonText}>
              {expanded ? t('betslip.card.showLess') : t('betslip.card.showMore', { count: formattedBetslip.selections.length - 1 })}
            </Text>
            <Ionicons 
              name={expanded ? 'chevron-up' : 'chevron-down'} 
              size={16} 
              color={theme.colors.accent} 
            />
          </TouchableOpacity>
        )}
      </View>

      {/* Betslip Summary */}
      <View style={styles.summary}>
        <View style={styles.summaryTop}>
          <View style={styles.totalOddContainer}>
            <Text style={styles.totalOddLabel}>{t('betslip.card.totalOdd')}</Text>
            <Text style={styles.totalOdd}>{formattedBetslip.totalOdd.toFixed(2)}</Text>
          </View>
          
          <View style={styles.confidenceContainer}>
            <Text style={styles.confidenceLabel}>{t('betslip.card.aiConfidence')}</Text>
            <View style={styles.confidenceMeterContainer}>
              <View style={styles.confidenceMeter}>
                <View 
                  style={[
                    styles.confidenceFill, 
                    { 
                      width: `${formattedBetslip.aiConfidence}%`,
                      backgroundColor: getConfidenceColor(formattedBetslip.aiConfidence)
                    }
                  ]} 
                />
              </View>
              <Text style={[styles.confidenceValue, { color: getConfidenceColor(formattedBetslip.aiConfidence) }]}>
                {formattedBetslip.aiConfidence}%
              </Text>
            </View>
          </View>
          
          <View style={styles.successRateContainer}>
            <Text style={styles.successRateLabel}>{t('betslip.card.successRate')}</Text>
            <Text style={[styles.successRate, { color: getSuccessRateColor(formattedBetslip.successRate) }]}>
              {formattedBetslip.successRate}%
            </Text>
          </View>
        </View>

        {/* Potential Return */}
        <View style={styles.returnContainer}>
          <View style={styles.stakeContainer}>
            <Text style={styles.stakeLabel}>{t('betslip.card.stake')}</Text>
            <View style={styles.stakeBadge}>
              <Text style={styles.stakeAmount}>${formattedBetslip.stake.toFixed(2)}</Text>
            </View>
          </View>
          
          <View style={styles.returnArrow}>
            <Ionicons name="arrow-forward" size={20} color={theme.colors.textSecondary} />
          </View>
          
          <View style={styles.potentialContainer}>
            <Text style={styles.potentialLabel}>{t('betslip.card.potentialReturn')}</Text>
            <Text style={styles.potentialReturn}>${formattedBetslip.potentialReturn.toFixed(2)}</Text>
          </View>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actions}>
        <TouchableOpacity 
          style={styles.detailsButton}
          onPress={handleViewDetails}
          disabled={isSaving}
        >
          <Ionicons 
            name={expanded ? "stats-chart" : "information-circle"} 
            size={18} 
            color={theme.colors.accent} 
          />
          <Text style={styles.detailsButtonText}>
            {expanded ? t('betslip.card.hideDetails') : t('betslip.card.viewDetails')}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.addButton, isSaving && styles.addButtonDisabled]}
          onPress={handleAddToBetslip}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="bookmark" size={18} color="#FFFFFF" />
              <Text style={styles.addButtonText}>{t('betslip.card.saveToProfile')}</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    ...theme.shadows.medium,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  betslipIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  betslipId: {
    color: theme.colors.accent,
    fontSize: theme.typography.subtitle.fontSize,
    fontWeight: '700',
  },
  matchesCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.cardElevated,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.sm,
  },
  matchesCountText: {
    color: theme.colors.textSecondary,
    fontSize: 11,
  },
  timestamp: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timestampText: {
    color: theme.colors.textSecondary,
    fontSize: 11,
  },
  selections: {
    marginBottom: theme.spacing.lg,
  },
  selection: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  selectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  league: {
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
  match: {
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
  predictionLabel: {
    color: theme.colors.textSecondary,
    fontSize: 11,
    marginBottom: 2,
  },
  prediction: {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.body.fontSize,
    fontWeight: '600',
  },
  oddContainer: {
    alignItems: 'flex-end',
  },
  oddLabel: {
    color: theme.colors.textSecondary,
    fontSize: 11,
    marginBottom: 2,
  },
  oddBadge: {
    backgroundColor: theme.colors.accent,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
    minWidth: 55,
    alignItems: 'center',
  },
  odd: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  selectionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: theme.spacing.xs,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  matchTime: {
    color: theme.colors.textSecondary,
    fontSize: 11,
  },
  confidenceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  confidence: {
    fontSize: 11,
    fontWeight: '600',
  },
  expandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: theme.spacing.sm,
  },
  expandButtonText: {
    color: theme.colors.accent,
    fontSize: 13,
    fontWeight: '600',
  },
  summary: {
    backgroundColor: theme.colors.cardElevated,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  summaryTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  totalOddContainer: {
    alignItems: 'center',
    flex: 1,
  },
  totalOddLabel: {
    color: theme.colors.textSecondary,
    fontSize: 11,
    marginBottom: 4,
  },
  totalOdd: {
    color: theme.colors.accent,
    fontSize: 22,
    fontWeight: '800',
  },
  confidenceContainer: {
    alignItems: 'center',
    flex: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderLeftColor: theme.colors.border,
    borderRightColor: theme.colors.border,
  },
  confidenceLabel: {
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
  successRateContainer: {
    alignItems: 'center',
    flex: 1,
  },
  successRateLabel: {
    color: theme.colors.textSecondary,
    fontSize: 11,
    marginBottom: 4,
  },
  successRate: {
    fontSize: 15,
    fontWeight: '700',
  },
  returnContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  stakeContainer: {
    alignItems: 'center',
  },
  stakeLabel: {
    color: theme.colors.textSecondary,
    fontSize: 11,
    marginBottom: 4,
  },
  stakeBadge: {
    backgroundColor: theme.colors.background,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.sm,
  },
  stakeAmount: {
    color: theme.colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  returnArrow: {
    paddingHorizontal: theme.spacing.sm,
  },
  potentialContainer: {
    alignItems: 'center',
  },
  potentialLabel: {
    color: theme.colors.textSecondary,
    fontSize: 11,
    marginBottom: 4,
  },
  potentialReturn: {
    color: theme.colors.highProbability,
    fontSize: 18,
    fontWeight: '800',
  },
  actions: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  detailsButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.accent,
    borderRadius: theme.borderRadius.md,
  },
  detailsButtonText: {
    color: theme.colors.accent,
    fontSize: theme.typography.body.fontSize,
    fontWeight: '600',
  },
  addButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.accent,
    borderRadius: theme.borderRadius.md,
  },
  addButtonDisabled: {
    backgroundColor: '#cccccc',
    opacity: 0.7,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: theme.typography.body.fontSize,
    fontWeight: '600',
  },
});

export default BetslipCard;