// import React, { useState } from 'react';
// import {
//   View,
//   TextInput,
//   StyleSheet,
//   TouchableOpacity,
// } from 'react-native';
// import { theme } from '../constants/theme';
// import Ionicons from '@expo/vector-icons/Ionicons';

// const SearchBar = ({
//   value,
//   onChangeText,
//   placeholder = 'Search matches, teams...',
//   onClear,
// }) => {
//   const [focused, setFocused] = useState(false);

//   return (
//     <View style={styles.container}>
//       <View
//         style={[
//           styles.searchBox,
//           focused && styles.focusedBox,
//         ]}
//       >
//         {/* Search Icon */}
//         <Ionicons
//           name="search"
//           size={18}
//           color={theme.colors.textMuted}
//           style={styles.leftIcon}
//         />

//         {/* Input */}
//         <TextInput
//           value={value}
//           onChangeText={onChangeText}
//           placeholder={placeholder}
//           placeholderTextColor={theme.colors.textMuted}
//           style={styles.input}
//           autoCorrect={false}
//           autoCapitalize="none"
//           returnKeyType="search"
//           onFocus={() => setFocused(true)}
//           onBlur={() => setFocused(false)}
//         />

//         {/* Clear Button */}
//         {!!value && (
//           <TouchableOpacity
//             onPress={() => {
//               onChangeText('');
//               onClear?.();
//             }}
//           >
//             <Ionicons
//               name="close-circle"
//               size={18}
//               color={theme.colors.textMuted}
//             />
//           </TouchableOpacity>
//         )}
//       </View>
//     </View>
//   );
// };

// const styles = StyleSheet.create({
//   container: {
//     marginHorizontal: theme.spacing.lg,
//     marginVertical: theme.spacing.md,
//   },
//   searchBox: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     backgroundColor: theme.colors.cardBackground,
//     borderRadius: theme.borderRadius.round,
//     paddingHorizontal: theme.spacing.lg,
//     paddingVertical: theme.spacing.md,
//     ...theme.shadows.small,
//   },
//   focusedBox: {
//     borderWidth: 1,
//     borderColor: theme.colors.accent,
//   },
//   leftIcon: {
//     marginRight: theme.spacing.sm,
//   },
//   input: {
//     flex: 1,
//     color: theme.colors.textPrimary,
//     fontSize: theme.typography.body.fontSize,
//   },
// });

// export default SearchBar;






import React, { useState } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { theme } from '../constants/theme';
import Ionicons from '@expo/vector-icons/Ionicons';

const SearchBar = ({
  value,
  onChangeText,
  placeholder = 'Search matches, teams...',
  onClear,
  isExpanded,
  onToggleExpand,
}) => {
  const [focused, setFocused] = useState(false);

  // When search icon is pressed
  const handleSearchIconPress = () => {
    if (!isExpanded) {
      onToggleExpand(true);
    }
  };

  // When close is pressed
  const handleClose = () => {
    onToggleExpand(false);
    onChangeText('');
    onClear?.();
    setFocused(false);
  };

  if (!isExpanded) {
    return (
      <TouchableOpacity
        style={styles.iconButton}
        onPress={handleSearchIconPress}
      >
        <Ionicons
          name="search"
          size={22}
          color={theme.colors.textPrimary}
        />
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.searchBox,
          focused && styles.focusedBox,
        ]}
      >
        {/* Search Icon */}
        <Ionicons
          name="search"
          size={18}
          color={theme.colors.textMuted}
          style={styles.leftIcon}
        />

        {/* Input */}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.textMuted}
          style={styles.input}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            // Auto-close if empty
            if (!value) {
              setTimeout(() => {
                onToggleExpand(false);
              }, 300);
            }
          }}
          autoFocus={true}
        />

        {/* Close Button */}
        <TouchableOpacity
          onPress={handleClose}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons
            name="close"
            size={18}
            color={theme.colors.textMuted}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  iconButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.sm,
  },
  container: {
    flex: 1,
    marginHorizontal: theme.spacing.md,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.borderRadius.round,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    height: 40,
    ...theme.shadows.small,
  },
  focusedBox: {
    borderWidth: 1,
    borderColor: theme.colors.accent,
  },
  leftIcon: {
    marginRight: theme.spacing.sm,
  },
  input: {
    flex: 1,
    color: theme.colors.textPrimary,
    fontSize: theme.typography.body.fontSize,
    padding: 0,
    marginRight: theme.spacing.sm,
  },
});

export default SearchBar;