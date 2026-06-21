import { View, Text, StyleSheet } from 'react-native'

export default function Loyers() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Module Loyers — à venir</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' },
  text: { fontSize: 16, color: '#94a3b8' },
})
