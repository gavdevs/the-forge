import React, { useState } from 'react';
import { View, Text, TextInput, Pressable } from 'react-native';
import { signIn } from '../../lib/auth';

export default function LoginScreen(): React.ReactElement {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  async function handleLogin(): Promise<void> {
    await signIn.email({ email, password });
  }

  return (
    <View>
      <Text>Login</Text>
      <TextInput placeholder="Email" value={email} onChangeText={setEmail} />
      <TextInput placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry />
      <Pressable onPress={handleLogin}><Text>Sign In</Text></Pressable>
    </View>
  );
}
