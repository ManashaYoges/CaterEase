import { StyleSheet } from 'react-native';
import { F, scaleFont } from './fonts';

export const T = StyleSheet.create({
  // Page / Screen Titles
  pageTitle:     { fontFamily: F.semibold,  fontSize: scaleFont(15.5), color: '#111827', lineHeight: scaleFont(21) },
  h1:            { fontFamily: F.semibold,  fontSize: scaleFont(15.5), color: '#111827', lineHeight: scaleFont(21) },

  // Section Headings
  sectionHeader: { fontFamily: F.semibold,  fontSize: scaleFont(12.5), color: '#111827', lineHeight: scaleFont(16) },
  h2:            { fontFamily: F.semibold,  fontSize: scaleFont(12.5), color: '#111827', lineHeight: scaleFont(16) },

  // Card Headings & Subheadings
  cardTitle:     { fontFamily: F.semibold,  fontSize: scaleFont(11.5), color: '#111827', lineHeight: scaleFont(15) },
  h3:            { fontFamily: F.semibold,  fontSize: scaleFont(11.5), color: '#111827', lineHeight: scaleFont(15) },
  h4:            { fontFamily: F.medium,    fontSize: scaleFont(10.5), color: '#111827', lineHeight: scaleFont(14) },

  // Entity Names (Customer names & Event names use regular weight)
  customerName:  { fontFamily: F.regular,   fontSize: scaleFont(11.5), color: '#111827', lineHeight: scaleFont(15) },
  eventName:     { fontFamily: F.regular,   fontSize: scaleFont(11.5), color: '#111827', lineHeight: scaleFont(15) },

  // Body Content (Regular weight)
  body:          { fontFamily: F.regular,   fontSize: scaleFont(11.5), color: '#374151', lineHeight: scaleFont(16) },
  bodyMed:       { fontFamily: F.medium,    fontSize: scaleFont(11.5), color: '#374151', lineHeight: scaleFont(16) },
  bodySm:        { fontFamily: F.regular,   fontSize: scaleFont(10), color: '#4B5563', lineHeight: scaleFont(14) },
  bodySmMed:     { fontFamily: F.medium,    fontSize: scaleFont(10), color: '#374151', lineHeight: scaleFont(14) },

  // Card Content, Lists, Table Items & Descriptions (Regular weight)
  cardContent:   { fontFamily: F.regular,   fontSize: scaleFont(10), color: '#6B7280', lineHeight: scaleFont(13.5) },
  description:   { fontFamily: F.regular,   fontSize: scaleFont(10), color: '#6B7280', lineHeight: scaleFont(13.5) },
  value:         { fontFamily: F.regular,   fontSize: scaleFont(11), color: '#111827', lineHeight: scaleFont(15) },
  listItem:      { fontFamily: F.regular,   fontSize: scaleFont(11), color: '#374151', lineHeight: scaleFont(15) },

  // Labels (Medium or regular weight)
  label:         { fontFamily: F.medium,    fontSize: scaleFont(10), color: '#374151', lineHeight: scaleFont(13.5) },
  labelSm:       { fontFamily: F.medium,    fontSize: scaleFont(9), color: '#6B7280', lineHeight: scaleFont(12) },
  caption:       { fontFamily: F.regular,   fontSize: scaleFont(9), color: '#9CA3AF', lineHeight: scaleFont(12) },
  captionMed:    { fontFamily: F.medium,    fontSize: scaleFont(9), color: '#9CA3AF', lineHeight: scaleFont(12) },

  // Key Statistics
  statNum:       { fontFamily: F.semibold,  fontSize: scaleFont(15.5), color: '#111827', lineHeight: scaleFont(19) },
  statLabel:     { fontFamily: F.regular,   fontSize: scaleFont(9), color: '#6B7280', lineHeight: scaleFont(12) },

  // Buttons
  btnLg:         { fontFamily: F.semibold,  fontSize: scaleFont(12.5), color: '#fff' },
  btnMd:         { fontFamily: F.medium,    fontSize: scaleFont(11), color: '#fff' },
  btnSm:         { fontFamily: F.medium,    fontSize: scaleFont(10), color: '#fff' },

  // Special / Badges
  price:         { fontFamily: F.semibold,  fontSize: scaleFont(11), color: '#1B4332' },
  badge:         { fontFamily: F.medium,    fontSize: scaleFont(9), color: '#065F46' },
  badgeSm:       { fontFamily: F.medium,    fontSize: scaleFont(8.5), color: '#065F46' },
  tab:           { fontFamily: F.regular,   fontSize: scaleFont(10), color: '#9CA3AF' },
  tabActive:     { fontFamily: F.medium,    fontSize: scaleFont(10), color: '#1B4332' },
});

