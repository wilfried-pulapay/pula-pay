import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useStyles } from "../hooks/use-styles";
import type { Theme } from "../theme/types";

type QuickAction = {
  titleKey: string;
  subtitleKey: string;
  descriptionKey: string;
  emoji: string;
  route: string;
};

const quickActionsData: QuickAction[] = [
  {
    titleKey: "quickActions.deposit.title",
    subtitleKey: "quickActions.deposit.subtitle",
    descriptionKey: "quickActions.deposit.description",
    emoji: "💰",
    route: "/wallet/deposit",
  },
  {
    titleKey: "quickActions.receive.title",
    subtitleKey: "quickActions.receive.subtitle",
    descriptionKey: "quickActions.receive.description",
    emoji: "📥",
    route: "/wallet/receive",
  },
  {
    titleKey: "quickActions.transfer.title",
    subtitleKey: "quickActions.transfer.subtitle",
    descriptionKey: "quickActions.transfer.description",
    emoji: "💸",
    route: "/wallet/transfert",
  },
  {
    titleKey: "quickActions.withdraw.title",
    subtitleKey: "quickActions.withdraw.subtitle",
    descriptionKey: "quickActions.withdraw.description",
    emoji: "🏧",
    route: "/wallet/withdraw",
  },
  {
    titleKey: "quickActions.recharge.title",
    subtitleKey: "quickActions.recharge.subtitle",
    descriptionKey: "quickActions.recharge.description",
    emoji: "📱",
    route: "#",
  },
  {
    titleKey: "quickActions.bills.title",
    subtitleKey: "quickActions.bills.subtitle",
    descriptionKey: "quickActions.bills.description",
    emoji: "🧾",
    route: "#",
  },
];

// Icon color per action index (deposit, receive, transfer, withdraw, recharge, bills)
const ACTION_ICON_COLORS = ['#FF6B00', '#1F8A70', '#0D0D0D', '#6B6B6B', '#6B6B6B', '#6B6B6B'];

export default function QuickActions() {
  const { t } = useTranslation();
  const router = useRouter();
  const styles = useStyles(getStyles);

  const goTo = (route: string) => {
    if (route !== "#") {
      router.push(route as any);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>{t("quickActions.title")}</Text>
        <TouchableOpacity onPress={() => {}}>
          <Text style={styles.seeAll}>{t("quickActions.seeAll")}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.grid}>
        {quickActionsData.map((action, idx) => {
          const iconColor = ACTION_ICON_COLORS[idx] ?? '#6B6B6B';
          const isDisabled = action.route === '#';
          return (
          <TouchableOpacity
            key={action.titleKey}
            style={[styles.card, isDisabled && styles.cardDisabled]}
            onPress={() => goTo(action.route)}
            activeOpacity={0.8}
          >
            <View style={[styles.iconWrap, { backgroundColor: iconColor + '1F' }]}>
              <Text style={styles.icon}>{action.emoji}</Text>
            </View>
            <Text style={styles.cardTitle}>{t(action.titleKey)}</Text>
            <Text style={styles.cardSubtitle}>{t(action.subtitleKey)}</Text>
          </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const getStyles = (theme: Theme) => StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: theme.colors.textMuted,
  },
  seeAll: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.primary,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  card: {
    width: '47%',
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.borderRadius.l,
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cardDisabled: {
    opacity: 0.4,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: theme.borderRadius.m,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  icon: {
    fontSize: 20,
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 2,
  },
  cardSubtitle: {
    fontSize: 10,
    fontWeight: '400',
    color: theme.colors.textMuted,
  },
});
