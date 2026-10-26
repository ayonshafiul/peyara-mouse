import {StyleSheet, View} from 'react-native';
import React from 'react';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import type {AnimatedStyle} from 'react-native-reanimated';
import type {ViewStyle} from 'react-native';
import type {
  GestureType,
  LegacyComposedGesture,
} from 'react-native-gesture-handler';
import colors from '../../constants/colors';
import LandscapeTouchpadView from '../LandscapeTouchpadView';
import LandscapeDeckView from '../LandscapeDeckView';
import CommonToolbar, {type ControlView} from '../toolbars/CommonToolbar';
import TouchpadToolbar from '../toolbars/TouchpadToolbar';
import DeckToolbar from '../toolbars/DeckToolbar';
import RoundKey from '../RoundKey';
import type {TuneValues} from '../QuickTuneRow';
import type {DeckViewController} from '../../hooks/useDeckView';

type DetectorGesture = LegacyComposedGesture | GestureType;

interface LandscapeContainerProps {
  activeView: ControlView;
  showTopControls: boolean;
  onShowControls: () => void;
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

export default function LandscapeContainer({
  activeView,
  showTopControls,
  onShowControls,
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
}: LandscapeContainerProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: Math.max(insets.top, 8),
          paddingLeft: Math.max(insets.left, 8),
          paddingRight: Math.max(insets.right, 8),
          paddingBottom: Math.max(insets.bottom, 8),
        },
      ]}>
      {showTopControls ? (
        <>
          <View style={styles.toolbarWrap}>
            <CommonToolbar
              activeView={activeView}
              isLandscape
              onSelectTouchpad={onSelectTouchpad}
              onSelectDeck={onSelectDeck}
              onToggleKeyboardInput={onToggleKeyboardInput}
              onShowKeyboardModal={onShowKeyboardModal}
              onShowClipboard={onShowClipboard}
              onToggleOrientation={onToggleOrientation}
              onOpenHelp={onOpenHelp}
              onDisconnect={onDisconnect}
            />
          </View>
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
            />
          )}
        </>
      ) : (
        <View style={styles.hiddenBar}>
          <RoundKey
            containerStyle={styles.gearKey}
            onPress={onShowControls}>
            <MaterialIcons name="settings" size={20} color={colors.WHITE} />
          </RoundKey>
        </View>
      )}
      {hiddenInput}
      <View style={styles.content}>
        {activeView === 'touchpad' ? (
          <LandscapeTouchpadView
            composed={composed}
            scrollGesture={scrollGesture}
            scrollWheelStyles={scrollWheelStyles}
            sendLeftClick={sendLeftClick}
            sendRightClick={sendRightClick}
            onTouchpadLayout={onTouchpadLayout}
          />
        ) : (
          <LandscapeDeckView
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
  },
  toolbarWrap: {
    marginTop: -16,
  },
  hiddenBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  gearKey: {
    width: 38,
    height: 38,
    margin: 0,
  },
  content: {
    flex: 1,
    width: '100%',
    marginTop: 8,
  },
});
