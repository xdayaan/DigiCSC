import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Switch, Image } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Colors } from '@/constants/Colors';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useColorScheme } from '@/hooks/useColorScheme';

interface FreelancerProfileProps {
  freelancer: {
    id: number;
    name: string;
    email?: string;
    csc_id?: string;
    phone: string;
  };
  onStatusChange?: (isAvailable: boolean) => void;
}

const FreelancerProfile: React.FC<FreelancerProfileProps> = ({ 
  freelancer, 
  onStatusChange 
}) => {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const [isAvailable, setIsAvailable] = useState(true);

  const handleAvailabilityToggle = (value: boolean) => {
    setIsAvailable(value);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (onStatusChange) {
      onStatusChange(value);
    }
  };

  return (
    <Animated.View
      entering={FadeIn.delay(300).duration(500)}
      style={styles.container}
    >
      <ThemedView style={styles.profileCard}>
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            <View style={[
              styles.avatarCircle,
              { backgroundColor: colorScheme === 'dark' ? Colors.dark.tint : Colors.light.tint }
            ]}>
              <Text style={styles.avatarText}>
                {freelancer.name.substring(0, 1).toUpperCase()}
              </Text>
            </View>
          </View>
          <View style={styles.profileInfo}>
            <ThemedText type="subtitle">{freelancer.name}</ThemedText>
            <ThemedText style={styles.idText}>CSC ID: {freelancer.csc_id || 'N/A'}</ThemedText>
          </View>
        </View>

        <View style={styles.statusContainer}>
          <ThemedText>Availability Status</ThemedText>
          <View style={styles.switchContainer}>
            <Text style={[
              styles.statusText,
              { color: colorScheme === 'dark' ? '#999999' : '#666666' }
            ]}>
              {isAvailable ? 'Available' : 'Away'}
            </Text>
            <Switch
              trackColor={{ 
                false: '#767577', 
                true: colorScheme === 'dark' ? '#81b0ff' : Colors.light.tint 
              }}
              thumbColor={isAvailable ? '#fff' : '#f4f3f4'}
              ios_backgroundColor="#3e3e3e"
              onValueChange={handleAvailabilityToggle}
              value={isAvailable}
            />
          </View>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <ThemedText type="subtitle" style={styles.statNumber}>12</ThemedText>
            <ThemedText style={styles.statLabel}>Total Calls</ThemedText>
          </View>
          <View style={styles.statItem}>
            <ThemedText type="subtitle" style={styles.statNumber}>4.8</ThemedText>
            <ThemedText style={styles.statLabel}>Rating</ThemedText>
          </View>
          <View style={styles.statItem}>
            <ThemedText type="subtitle" style={styles.statNumber}>₹250</ThemedText>
            <ThemedText style={styles.statLabel}>Today</ThemedText>
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.button,
            { backgroundColor: colorScheme === 'dark' ? Colors.dark.tint : Colors.light.tint }
          ]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.push('/screens/ChatScreen');
          }}
        >
          <IconSymbol name="chat.bubble.fill" size={24} color="#ffffff" />
          <Text style={styles.buttonText}>View Customer Inquiries</Text>
        </TouchableOpacity>
      </ThemedView>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  profileCard: {
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarContainer: {
    marginRight: 15,
  },
  avatarCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  profileInfo: {
    flex: 1,
  },
  idText: {
    marginTop: 4,
    fontSize: 14,
    opacity: 0.7,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(150, 150, 150, 0.2)',
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    marginRight: 10,
    fontSize: 14,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
    opacity: 0.7,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 10,
  },
});

export default FreelancerProfile;