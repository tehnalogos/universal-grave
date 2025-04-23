'use client';
import React, { useEffect, useState } from 'react';
import { Box, Button, HStack, Text, useToast, VStack } from '@chakra-ui/react';
import { BrowserProvider } from 'ethers';
import { useConnectedAccount } from '@/contexts/ConnectedAccountProvider';
import { subscribeToUapURD } from '@/utils/configDataKeyValueStore';
import { updateBECPermissions } from '@/utils/urdUtils';

function URDSetup() {
  const toast = useToast({ position: 'bottom-left' });
  const { universalProfile, isConnected, appNetworkConfig, refreshProfileData } = useConnectedAccount();

  // State to track loading/transaction status for each action
  const [isUpdatingPermissions, setIsUpdatingPermissions] = useState(false);
  const [isInstallingProtocol, setIsInstallingProtocol] = useState(false);

  const handleUpdateBECPermissions = async () => {
    if (!isConnected || !universalProfile?.address) {
      toast({
        title: 'Error',
        description: 'No wallet address found',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    if (!universalProfile?.mainUPController) {
      toast({
        title: 'Error',
        description: 'No UP Extension main controller found',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    setIsUpdatingPermissions(true);
    try {
      const provider = new BrowserProvider(window.lukso);
      await updateBECPermissions(
        provider,
        universalProfile?.address,
        universalProfile?.mainUPController
      );
      await refreshProfileData();

      toast({
        title: 'Success',
        description: 'Permissions granted.',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
    } catch (error: any) {
      console.error('Error updating permissions', error);
      if (!error.message?.includes('user rejected action')) {
        toast({
          title: 'Error',
          description: `Error giving UP Extension permissions: ${error.message}`,
          status: 'error',
          duration: null,
          isClosable: true,
        });
      }
    } finally {
      setIsUpdatingPermissions(false);
    }
  };

  const handleInstallUAP = async () => {
    if (!isConnected || !universalProfile?.address) {
      toast({
        title: 'Error',
        description: 'No wallet address found',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    setIsInstallingProtocol(true);
    try {
      const provider = new BrowserProvider(window.lukso);
      await subscribeToUapURD(provider, universalProfile?.address, appNetworkConfig.assistantsProtocolAddress);
      toast({
        title: 'Success',
        description: 'Universal Assistant Protocol installed.',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
      await refreshProfileData();
      // window.location.reload(); // Refresh page after confirmation
    } catch (error: any) {
      console.error(
        'Error subscribing to UAP Universal Receiver Delegate',
        error.message
      );
      if (!error.message.includes('user rejected action')) {
        //extract truncated error message if too long
        const errorSubstring =
          error.message.length > 100
            ? `${error.message.substring(0, 100)}...`
            : error.message;
        toast({
          title: 'Error',
          description: `Error subscribing to UAP Universal Receiver Delegate: ${errorSubstring}`,
          status: 'error',
          duration: null,
          isClosable: true,
        });
      }
    } finally {
      setIsInstallingProtocol(false);
    }
  };

  return (
    <Box textAlign="center" maxWidth="600px" mx="auto" mt={8} color="white">
      <Text fontSize="lg" fontWeight="semibold" mb={4}>
        To use the GRAVE 👻 you must first install the
        Universal Assistant Protocol on your 🆙
      </Text>

      <VStack spacing={6} align="stretch">
        {/* Instruction 1 */}
        <HStack justifyContent="space-between" align="center">
          <Text fontSize="md" textAlign="left" fontWeight="semibold" flex="1">
            1. Give 🆙 the permissions to install the UAP
          </Text>
          <Button
            minW="130px"
            size="sm"
            bg="orange.500"
            color="white"
            _hover={{ bg: 'orange.600' }}
            _active={{ bg: 'orange.700' }}
            onClick={handleUpdateBECPermissions}
            isDisabled={
              (isConnected && universalProfile?.protocolConfig?.hasCorrectPermissions) || !isConnected
            }
            isLoading={isUpdatingPermissions}
          >
            Give Permissions
          </Button>
        </HStack>

        {/* Instruction 2 */}
        <HStack justifyContent="space-between" align="center">
          <Text fontSize="md" textAlign="left" fontWeight="semibold" flex="1">
            2. Install the UAP on your 🆙
          </Text>
          <Button
            minW="130px"
            size="sm"
            bg="orange.500"
            color="white"
            _hover={{ bg: 'orange.600' }}
            _active={{ bg: 'orange.700' }}
            onClick={handleInstallUAP}
            isLoading={isInstallingProtocol}
            isDisabled={!isConnected || !universalProfile?.protocolConfig?.hasCorrectPermissions}
          >
            Install Protocol
          </Button>
        </HStack>
      </VStack>
    </Box>
  );
};

export default URDSetup;
