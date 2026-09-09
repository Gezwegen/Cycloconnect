import { useState, useEffect, useCallback } from 'react';
import { MioDevice, DeviceState } from '../../types';
import { NotificationType } from './useNotification';

interface UseMioDeviceProps {
  isElectron: boolean;
  showToast: (message: string, type?: NotificationType) => void;
}

export function useMioDevice({ isElectron, showToast }: UseMioDeviceProps) {
  const [device, setDevice] = useState<MioDevice | null>(null);
  const [deviceState, setDeviceState] = useState<DeviceState>({ status: 'scanning' });
  const [isLoading, setIsLoading] = useState(true);

  // Initial detection & event listener
  useEffect(() => {
    let unmountDeviceEvent: (() => void) | undefined;

    async function initDevice() {
      setIsLoading(true);
      setDeviceState({ status: 'scanning' });

      if (isElectron && window.electronAPI) {
        try {
          const detected = await window.electronAPI.getDeviceStatus();
          setDevice(detected);
          setDeviceState(
            detected
              ? { status: 'connected', device: detected }
              : { status: 'disconnected' }
          );

          unmountDeviceEvent = window.electronAPI.onDeviceEvent((updatedDevice) => {
            setDevice(updatedDevice);
            setDeviceState(
              updatedDevice
                ? { status: 'connected', device: updatedDevice }
                : { status: 'disconnected' }
            );

            if (updatedDevice) {
              showToast(
                `Mio Cyclo detected on ${updatedDevice.deviceId} (${updatedDevice.volumeName})`,
                'success'
              );
            } else {
              showToast('Mio Cyclo USB disconnected', 'info');
            }
          });
        } catch (err) {
          const errMsg = (err as Error).message;
          setDeviceState({ status: 'error', message: errMsg });
          showToast(`Hardware detection error: ${errMsg}`, 'error');
        }
      } else {
        // Browser development preview
        setDevice(null);
        setDeviceState({ status: 'disconnected' });
      }

      setIsLoading(false);
    }

    initDevice();

    return () => {
      if (unmountDeviceEvent) unmountDeviceEvent();
    };
  }, [isElectron, showToast]);

  // Rescan USB Hardware
  const rescanDevice = useCallback(async () => {
    setIsLoading(true);
    setDeviceState({ status: 'scanning' });
    showToast('Scanning for connected Mio Cyclo USB device...', 'info');

    if (isElectron && window.electronAPI) {
      try {
        const detected = await window.electronAPI.rescanDevice();
        setDevice(detected);
        setDeviceState(
          detected
            ? { status: 'connected', device: detected }
            : { status: 'disconnected' }
        );

        if (detected) {
          showToast(`Device found: ${detected.volumeName} (${detected.deviceId})`, 'success');
        } else {
          showToast('No Mio device with volume "Mio_data" found', 'info');
        }
      } catch (err) {
        const errMsg = (err as Error).message;
        setDeviceState({ status: 'error', message: errMsg });
        showToast(`Hardware scan error: ${errMsg}`, 'error');
      }
    } else {
      await new Promise((r) => setTimeout(r, 600));
      showToast('Connect your Mio Cyclo via USB to begin', 'info');
      setDeviceState({ status: 'disconnected' });
    }

    setIsLoading(false);
  }, [isElectron, showToast]);

  // Open folder in OS explorer
  const openFolder = useCallback(
    async (folderPath: string) => {
      if (isElectron && window.electronAPI) {
        try {
          const opened = await window.electronAPI.openFolder(folderPath);
          if (!opened) {
            showToast(`Could not open directory: ${folderPath}`, 'error');
          }
        } catch (err) {
          showToast(`Error opening directory: ${(err as Error).message}`, 'error');
        }
      } else {
        showToast(`Direct OS folder opening is supported in Desktop App: ${folderPath}`, 'info');
      }
    },
    [isElectron, showToast]
  );

  return {
    device,
    deviceState,
    isLoading,
    rescanDevice,
    openFolder,
    setDevice,
  };
}

