import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Dimensions,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

const WelcomeScreen = ({ navigation }) => {  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContainer} 
        showsVerticalScrollIndicator={true}
        bounces={true}
        alwaysBounceVertical={true}>
        {/* Header with Logo and Title */}<View style={styles.headerContainer}>
          <Image
            source={require('../../../assets/icon.png')}
            style={styles.logo}
          />
          <Text style={styles.title}>DigiCSC</Text>
          <Text style={styles.subtitle}>All your CSC services in your hand</Text>
        </View>

        {/* Customer Section */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>CUSTOMER</Text>
          <TouchableOpacity
            style={[styles.button, styles.customerButton]}
            onPress={() => navigation.navigate('CustomerLogin')}
          >
            <Text style={styles.buttonText}>Login</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.outlineButton]}
            onPress={() => navigation.navigate('CustomerSignup')}
          >
            <Text style={styles.outlineButtonText}>Sign Up</Text>
          </TouchableOpacity>
        </View>

        {/* Freelancer Section */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>FREELANCER</Text>
          <TouchableOpacity
            style={[styles.button, styles.freelancerButton]}
            onPress={() => navigation.navigate('FreelancerLogin')}
          >
            <Text style={styles.buttonText}>Login</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.outlineButton, { borderColor: '#00A86B' }]}
            onPress={() => navigation.navigate('FreelancerSignup')}
          >
            <Text style={[styles.outlineButtonText, { color: '#00A86B' }]}>Sign Up</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F8FF',
    paddingHorizontal: 20,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingBottom: 30, // Extra padding for scrolling space
  },
  headerContainer: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 20,
  },
  logo: {
    width: 150,
    height: 150,
    resizeMode: 'contain',
    marginBottom: 16,
    borderRadius: 20,
  },
  title: {
    fontSize: 55,
    fontWeight: '1200',
    color: '#0047AB',
    letterSpacing: 1.5,
    marginBottom: 6,
    fontFamily: 'gothic-ui',
  },
  subtitle: {
    fontSize: 18,
    color: '#0047AB',
    textAlign: 'center',
    maxWidth: width * 0.8,
  },
  sectionContainer: {
    backgroundColor: '#0047AB',
    padding: 20,
    marginBottom: 25,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 10,
    elevation: 5,
  },
  sectionTitle: {
    fontSize: 25,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 16,
    textAlign: 'center',
    fontStyle: 'bold',
  },
  button: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginVertical: 8,
  },
  customerButton: {
    backgroundColor: '#007BFF',
  },
  freelancerButton: {
    backgroundColor: '#00A86B',
  },
  outlineButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#007BFF',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  outlineButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default WelcomeScreen;