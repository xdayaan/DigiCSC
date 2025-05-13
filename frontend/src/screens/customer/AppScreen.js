import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, StatusBar } from 'react-native';
import { Ionicons, MaterialCommunityIcons, FontAwesome5, MaterialIcons } from '@expo/vector-icons';
import { useNavigation, CommonActions } from '@react-navigation/native';
import chatService from '../../services/chatService';

const ServiceCard = ({ title, icon, onPress, iconType }) => {

  const renderIcon = () => {
    switch (iconType) {
      case 'Ionicons':
        return <Ionicons name={icon} size={40} color="#4C566A" />;
      case 'MaterialCommunityIcons':
        return <MaterialCommunityIcons name={icon} size={40} color="#4C566A" />;
      case 'FontAwesome5':
        return <FontAwesome5 name={icon} size={40} color="#4C566A" />;
      case 'MaterialIcons':
        return <MaterialIcons name={icon} size={40} color="#4C566A" />;
      default:
        return <Ionicons name={icon} size={40} color="#4C566A" />;
    }
  };

  return (
    <TouchableOpacity 
      style={styles.card} 
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.iconContainer}>
        {renderIcon()}
      </View>
      <Text style={styles.cardTitle}>{title}</Text>
    </TouchableOpacity>
  );
};

const AppScreen = () => {
  const navigation = useNavigation();

  // Function to go back
  const handleGoBack = () => {
    navigation.goBack();
  };

  // Function to handle service selection and redirect to AI Chat
  const handleServicePress = (service) => {
    // Navigate to AiChatScreen
    navigation.navigate('AiChat', { 
      autoMessage: service.title,  // Pass the service name as a parameter
      autoSend: true               // Flag to auto-send the message
    });
  }

  const services = [
    { 
      id: 1, 
      title: 'UTU Registration', 
      icon: 'clipboard-text-outline', 
      iconType: 'MaterialCommunityIcons',
      onPress: () => handleServicePress({ title: 'UTU Registration' })
    },
    { 
      id: 2, 
      title: 'PAN Card → NSDL Website', 
      icon: 'card-account-details-outline', 
      iconType: 'MaterialCommunityIcons',
      onPress: () => handleServicePress({ title: 'PAN Card → NSDL Website' })
    },
    { 
      id: 3, 
      title: 'PAN Card → E-PAN', 
      icon: 'card-account-details', 
      iconType: 'MaterialCommunityIcons',
      onPress: () => handleServicePress({ title: 'PAN Card → E-PAN' })
    },
    { 
      id: 4, 
      title: 'DRIVING LICENCE', 
      icon: 'id-card', 
      iconType: 'FontAwesome5',
      onPress: () => handleServicePress({ title: 'DRIVING LICENCE' })
    },
    { 
      id: 5, 
      title: 'PM Kissan Samman Nidhi', 
      icon: 'leaf', 
      iconType: 'FontAwesome5',
      onPress: () => handleServicePress({ title: 'PM Kissan Samman Nidhi' })
    },
    { 
      id: 6, 
      title: 'RTI → Right to information', 
      icon: 'information-circle-outline', 
      iconType: 'Ionicons',
      onPress: () => handleServicePress({ title: 'RTI → Right to information' })
    }
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#ECEFF4" barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={handleGoBack}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#2E3440" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Services</Text>
      </View>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.gridContainer}>
          {services.map((service) => (
            <ServiceCard
              key={service.id}
              title={service.title}
              icon={service.icon}
              iconType={service.iconType}
              onPress={service.onPress}
            />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ECEFF4',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 8,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2E3440',
  },
  scrollContainer: {
    padding: 16,
    paddingTop: 0,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    width: '48%',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    height: 130,
  },
  iconContainer: {
    marginBottom: 12,
    height: 50,
    width: 50,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E5E9F0',
    borderRadius: 25,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2E3440',
    textAlign: 'center',
  },
});

export default AppScreen;