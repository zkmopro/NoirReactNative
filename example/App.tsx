import {
  Image,
  StyleSheet,
  Button,
  TextInput,
  View,
  Text,
  ScrollView,
} from 'react-native';

import {
  getNoirVerificationKey,
  generateNoirProof,
  verifyNoirProof,
} from 'mopro-ffi';
import * as FileSystem from 'expo-file-system';
import { useState } from 'react';

// Path for the circuit file
const circuitFileName = 'noir_multiplier2.json';
const circuitFilePath = `${FileSystem.documentDirectory}${circuitFileName}`;
const srsFileName = 'noir_multiplier2.bin';
const srsFilePath = `${FileSystem.documentDirectory}${srsFileName}`;

async function ensureCircuitExists() {
  const fileInfo = await FileSystem.getInfoAsync(circuitFilePath);
  const expectedSizeBytes = 6000000; // Approx 6MB, adjust if needed

  if (
    !fileInfo.exists ||
    (fileInfo.exists && fileInfo.size < expectedSizeBytes)
  ) {
    if (fileInfo.exists) {
      console.log(
        `Existing circuit file size (${fileInfo.size}) is less than expected (${expectedSizeBytes}), deleting and re-downloading...`
      );
      await FileSystem.deleteAsync(circuitFilePath, { idempotent: true });
    } else {
      console.log('Circuit file not found, downloading...');
    }

    try {
      const circuitUrl =
        'https://raw.githubusercontent.com/zkmopro/mopro/54a930d90295ddf14f77983340a5a15cf6af63f6/cli/src/template/init/test-vectors/noir/noir_multiplier2.json';
      const circuitDownloadResult = await FileSystem.downloadAsync(
        circuitUrl,
        circuitFilePath
      );
      console.log('Circuit file downloaded to:', circuitDownloadResult.uri);
      const srsUrl =
        'https://github.com/zkmopro/mopro/raw/54a930d90295ddf14f77983340a5a15cf6af63f6/cli/src/template/init/test-vectors/noir/noir_multiplier2.srs';
      const srsDownloadResult = await FileSystem.downloadAsync(
        srsUrl,
        srsFilePath
      );
      console.log('SRS file downloaded to:', srsDownloadResult.uri);
      // Optional: Add a check here for downloadResult.size if needed
    } catch (error) {
      console.error('Failed to download circuit file:', error);
      throw new Error('Failed to download circuit file.');
    }
  } else {
    console.log(
      `Circuit file already exists and is valid size (${fileInfo.size} bytes):`,
      circuitFilePath
    );
  }
}

function NoirProofComponent() {
  const [a, setA] = useState('3');
  const [b, setB] = useState('4');
  const [inputs, setInputs] = useState<string[]>([]);
  const [proof, setProof] = useState<ArrayBuffer>(new ArrayBuffer(0));
  const [isValid, setIsValid] = useState<string>('');
  const [vk, setVk] = useState<ArrayBuffer>(new ArrayBuffer(0));

  async function genProof(): Promise<void> {
    const circuitInputs = [a, b];
    const circuitName = 'noir_multiplier2.json';
    await ensureCircuitExists();

    try {
      const onChain = true; // Use Keccak for Solidity compatibility
      const lowMemoryMode = false;

      // Generate or get existing verification key
      let verificationKey: ArrayBuffer;
      if (vk.byteLength === 0) {
        console.log('Generating verification key...');
        verificationKey = getNoirVerificationKey(
          circuitFilePath.replace('file://', ''),
          undefined,
          onChain,
          lowMemoryMode
        );
        setVk(verificationKey);
      } else {
        verificationKey = vk;
      }

      console.log('Generating proof with verification key...');
      const res: ArrayBuffer = generateNoirProof(
        circuitFilePath.replace('file://', ''),
        undefined,
        circuitInputs,
        onChain,
        verificationKey,
        lowMemoryMode
      );
      setProof(res);
    } catch (error) {
      console.error('Error generating proof:', error);
    }
  }

  async function verifyProof(): Promise<void> {
    await ensureCircuitExists();

    try {
      const onChain = true; // Use Keccak for Solidity compatibility
      const lowMemoryMode = false;

      const res: boolean = verifyNoirProof(
        circuitFilePath.replace('file://', ''),
        proof,
        onChain,
        vk,
        lowMemoryMode
      );
      setIsValid(res.toString());
    } catch (error) {
      console.error('Error verifying proof:', error);
    }
  }

  return (
    <View style={styles.proofContainer}>
      <View style={styles.inputContainer}>
        <Text style={styles.label}>a</Text>
        <TextInput
          testID="noir-input-a"
          style={styles.input}
          placeholder="Enter value for a"
          value={a}
          onChangeText={setA}
          keyboardType="numeric"
        />
      </View>
      <View style={styles.inputContainer}>
        <Text style={styles.label}>b</Text>
        <TextInput
          testID="noir-input-b"
          style={styles.input}
          placeholder="Enter value for b"
          value={b}
          onChangeText={setB}
          keyboardType="numeric"
        />
      </View>
      <Button title="Generate Noir Proof" onPress={() => genProof()} />
      <Button title="Verify Noir Proof" onPress={() => verifyProof()} />
      <View style={styles.stepContainer}>
        <Text style={styles.label}>Proof is Valid:</Text>
        <Text style={styles.output}>{isValid}</Text>
        {/* TODO: add public signals */}
        {/* <ThemedText type="subtitle">Public Signals:</ThemedText>
                <ScrollView style={styles.outputScroll}>
                    <Text style={styles.output}>{JSON.stringify(inputs)}</Text>
                </ScrollView> */}
        <Text style={styles.label}>Proof:</Text>
        <ScrollView style={styles.outputScroll}>
          <Text style={styles.output}>
            {proof.byteLength > 0
              ? `Size: ${proof.byteLength} bytes\n` +
                Array.from(new Uint8Array(proof.slice(0, 100)))
                  .map((b) => b.toString(16).padStart(2, '0'))
                  .join(' ') +
                (proof.byteLength > 100 ? '...' : '')
              : 'No proof generated'}
          </Text>
        </ScrollView>
      </View>
    </View>
  );
}

export default function App() {
  return (
    <View style={styles.container}>
      <NoirProofComponent />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  stepContainer: {
    gap: 8,
    marginTop: 20,
  },
  input: {
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    flex: 1,
    paddingHorizontal: 10,
    marginLeft: 10,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  label: {
    fontSize: 16,
    width: 60,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 20,
  },
  outputTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 10,
  },
  output: {
    fontSize: 14,
    borderColor: 'lightgray',
    borderWidth: 1,
    padding: 10,
    marginTop: 5,
    backgroundColor: '#f9f9f9',
    fontFamily: 'monospace',
  },
  success: {
    color: 'green',
    fontWeight: 'bold',
  },
  error: {
    color: 'red',
    fontWeight: 'bold',
  },
  proofContainer: {
    padding: 10,
  },
  outputScroll: {
    maxHeight: 150,
    borderWidth: 1,
    borderColor: 'gray',
    marginBottom: 10,
  },
});
