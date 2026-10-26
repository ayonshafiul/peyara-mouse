import {StyleSheet, View} from 'react-native';
import React from 'react';
import type {AnimatedStyle} from 'react-native-reanimated';
import type {ViewStyle} from 'react-native';
import type {
  GestureType,
  LegacyComposedGesture,
} from 'react-native-gesture-handler';
import TouchpadView from '../TouchpadView';
import PortraitDeckView from '../PortraitDeckView';
import CommonToolbar, {type ControlView} from '../toolbars/CommonToolbar';
import TouchpadToolbar from '../toolbars/TouchpadToolbar';
import DeckToolbar from '../toolbars/DeckToolbar';
import type {TuneValues} from '../QuickTuneRow';
import type {DeckViewController} from '../../hooks/useDeckView';

type DetectorGesture = LegacyComposedGesture | GestureType;

interface PortraitContainerProps {
  activeView: ControlView;
  onSelectTouchpad: () => void;
  onSelectDeck: () => void;
  onToggleKeyboardInput: () => void;
  onShowKeyboardModal: () => void;
  onShowClipboard: () => void;
  onToggleOrientation: () => void;
  onOpenHelp: () => void;
  onDisconnect: () => void;
  tune: TuneValues;
  onTuneChange: (values: TuneValues) => void;
  composed: DetectorGesture;
  scrollGesture: DetectorGesture;
  scrollWheelStyles: AnimatedStyle<ViewStyle>;
  sendLeftClick: () => void;
  sendRightClick: () => void;
  onTouchpadLayout?: (width: number, height: number) => void;
  hiddenInput: React.ReactNode;
  deck: DeckViewController;
}

export default function PortraitContainer({
  activeView,
  onSelectTouchpad,
  onSelectDeck,
  onToggleKeyboardInput,
  onShowKeyboardModal,
  onShowClipboard,
  onToggleOrientation,
  onOpenHelp,
  onDisconnect,
  tune,
  onTuneChange,
  composed,
  scrollGesture,
  scrollWheelStyles,
  sendLeftClick,
  sendRightClick,
  onTouchpadLayout,
  hiddenInput,
  deck,
}: PortraitContainerProps) {
  return (
    <View style={styles.container}>
      <CommonToolbar
        activeView={activeView}
        isLandscape={false}
        onSelectTouchpad={onSelectTouchpad}
        onSelectDeck={onSelectDeck}
        onToggleKeyboardInput={onToggleKeyboardInput}
        onShowKeyboardModal={onShowKeyboardModal}
        onShowClipboard={onShowClipboard}
        onToggleOrientation={onToggleOrientation}
        onOpenHelp={onOpenHelp}
        onDisconnect={onDisconnect}
      />
      {activeView === 'touchpad' ? (
        <TouchpadToolbar values={tune} onChange={onTuneChange} />
      ) : (
        <DeckToolbar
          headerLabel={deck.headerLabel}
          headerSub={deck.headerSub}
          isManual={!!deck.manualSlug}
          loading={deck.loading}
          query={deck.query}
          onQueryChange={deck.setQuery}
          showSearch={deck.showSearch}
          columns={deck.columns}
          onDecreaseColumns={deck.decreaseColumns}
          onIncreaseColumns={deck.increaseColumns}
          selecting={deck.selecting}
          selectionTotal={deck.importedActions.length}
          selectionVisibleIds={deck.importedVisibleIds}
          onToggleSelectAll={deck.toggleSelectAll}
          onSaveSelection={deck.saveSelection}
          onCancelSelection={deck.cancelSelection}
          onImport={deck.handleImport}
          canImport={deck.canImportActions}
          onSelectApp={() => deck.setPickerVisible(true)}
          onRefresh={deck.requestRefresh}
          autoSync={deck.autoSync}
          onToggleAutoSync={deck.toggleAutoSync}
        />
      )}
      {hiddenInput}
      {activeView === 'touchpad' ? (
        <TouchpadView
          composed={composed}
          scrollGesture={scrollGesture}
          scrollWheelStyles={scrollWheelStyles}
          sendLeftClick={sendLeftClick}
          sendRightClick={sendRightClick}
          onTouchpadLayout={onTouchpadLayout}
        />
      ) : (
        <PortraitDeckView
          loading={deck.loading}
          selecting={deck.selecting}
          displayActions={deck.displayActions}
          displayEmptyText={deck.displayEmptyText}
          columns={deck.columns}
          onOrderChange={deck.handleOrderChange}
          onDragEnd={deck.handleDragEnd}
          onFireAction={deck.fireAction}
          hasSlug={deck.hasSlug}
          headerLabel={deck.headerLabel}
          canImport={deck.canImportActions}
          onImport={deck.handleImport}
          onSelectApp={() => deck.setPickerVisible(true)}
          scrollableRef={deck.scrollableRef}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
  },
});
