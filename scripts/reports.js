import { jsPDF } from 'jspdf';
import { applyPlugin } from 'jspdf-autotable';
import * as Tesseract from 'tesseract.js';
applyPlugin(jsPDF);
window.jspdf = { jsPDF };
window.Tesseract = Tesseract;
