import React from 'react';
import { Badge } from '../ui/Badge.jsx';
import { 
  Loader2, 
  Wifi, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  ArrowLeftRight, 
  HelpCircle,
  Clock
} from 'lucide-react';

export function ConnectionStatusBadge({ status, role, peerDevice }) {
  const getBadgeProps = () => {
    switch (status) {
      case 'creating':
        return {
          variant: 'purple',
          icon: Loader2,
          pulse: false,
          text: 'Creating Room...',
          iconClass: 'animate-spin'
        };
      case 'waiting':
        return {
          variant: 'cyan',
          icon: Wifi,
          pulse: true,
          text: 'Waiting for Device'
        };
      case 'paired':
        return {
          variant: 'success',
          icon: CheckCircle2,
          pulse: false,
          text: `Device Connected ${peerDevice?.label ? `(${peerDevice.label})` : ''}`
        };
      case 'requesting':
        return {
          variant: 'purple',
          icon: Clock,
          pulse: true,
          text: 'Awaiting Receiver Consent'
        };
      case 'prompting':
        return {
          variant: 'cyan',
          icon: ArrowLeftRight,
          pulse: true,
          text: 'Incoming Transfer Request'
        };
      case 'connecting':
        return {
          variant: 'purple',
          icon: Loader2,
          pulse: false,
          text: 'Establishing WebRTC Connection',
          iconClass: 'animate-spin'
        };
      case 'transferring':
        return {
          variant: 'success',
          icon: ArrowLeftRight,
          pulse: true,
          text: 'Transferring Directly (WebRTC)'
        };
      case 'completed':
        return {
          variant: 'success',
          icon: CheckCircle2,
          pulse: false,
          text: 'Transfer Completed'
        };
      case 'cancelled':
        return {
          variant: 'warning',
          icon: AlertTriangle,
          pulse: false,
          text: 'Transfer Cancelled'
        };
      case 'failed':
        return {
          variant: 'danger',
          icon: XCircle,
          pulse: false,
          text: 'Connection Failed'
        };
      case 'disconnected':
        return {
          variant: 'default',
          icon: XCircle,
          pulse: false,
          text: 'Peer Disconnected'
        };
      default:
        return {
          variant: 'default',
          icon: HelpCircle,
          pulse: false,
          text: 'Idle'
        };
    }
  };

  const { variant, icon: Icon, pulse, text, iconClass } = getBadgeProps();

  return (
    <Badge variant={variant} pulse={pulse} size="md">
      <Icon className={`w-3.5 h-3.5 ${iconClass || ''}`} />
      <span>{text}</span>
    </Badge>
  );
}
