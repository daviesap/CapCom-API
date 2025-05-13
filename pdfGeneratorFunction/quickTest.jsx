//A test file to test the pdfGeneratorFunction

import React from 'react';
import { render } from '@testing-library/react';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { pdfGeneratorFunction } from './pdfGeneratorFunction';
import { Document, Page, Text } from '@react-pdf/renderer';
import { usePDF } from '@react-pdf/renderer';
import { PDFViewer } from '@react-pdf/renderer';
import { PDFDownloadLink } from '@react-pdf/renderer';