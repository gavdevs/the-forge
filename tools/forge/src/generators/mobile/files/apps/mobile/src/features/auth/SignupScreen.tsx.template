import React, { useState } from 'react';
import { View, Text, TextInput, Pressable } from 'react-native';
import { signUp } from '../../lib/auth';

export default function SignupScreen(): React.ReactElement {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  async function handleSignup(): Promise<void> {
    await signUp.email({ email, password, name });
  }

  return (
    <View>
      <Text>Sign Up</Text>
      <TextInput placeholder="Name" value={name} onChangeText={setName} />
      <TextInput placeholder="Email" value={email} onChangeText={setEmail} />
      <TextInput placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry />
      <Pressable onPress={handleSignup}><Text>Create Account</Text></Pressable>
    </View>
  );
}
