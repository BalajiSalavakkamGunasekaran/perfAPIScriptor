import React, { useState } from "react";
import {
Box,
Button,
Card,
CardContent,
Container,
FormControl,
InputLabel,
MenuItem,
Select,
Typography,
CircularProgress,
Snackbar,
Alert,
Divider,
Grid,
Chip,
Tooltip,
IconButton,
TextField,
Dialog,
DialogTitle,
DialogContent,
DialogActions,
Tab,
Tabs
} from "@mui/material";
// Icons
import FileUploadOutlinedIcon from '@mui/icons-material/FileUploadOutlined';
import DownloadIcon from '@mui/icons-material/Download';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteIcon from '@mui/icons-material/Delete';

import SettingsIcon from '@mui/icons-material/Settings';
import CodeIcon from '@mui/icons-material/Code';
import ListAltIcon from '@mui/icons-material/ListAlt';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
// Import the generator functions
import { generateJMeterScript } from "./jmeterScriptGenerator";
import { generateLoadRunnerScript } from './loadRunnerScriptGenerator';
import { generateGatlingScript } from './gatlingScriptGenerator';
import { generateK6Script } from './k6ScriptGenerator';
import YAML from 'yaml';
import { parseSoapUI } from './parseSoapUI';
// Parser utilities
import { parsePostmanCollection } from './parsers';
import { parseSwaggerSpec } from './parsers';
import { parseOpenApiSpec } from './parsers';
export default function PerfApiScriptor() {
// State variables
const [file, setFile] = useState(null);
const [tool, setTool] = useState("jmeter");
const [convertedScript, setConvertedScript] = useState("");
const [error, setError] = useState("");
const [isLoading, setIsLoading] = useState(false);
const [notification, setNotification] = useState({ open: false, message: "", severity: "success" });
const [apiEndpoints, setApiEndpoints] = useState([]);
const [selectedEndpoints, setSelectedEndpoints] = useState([]);
const [tabValue, setTabValue] = useState(0);
const [showSettings, setShowSettings] = useState(false);
const [scriptOptions, setScriptOptions] = useState({
includeHeaders: true,
includeCookies: true,
addAssertions: true,
loopCount: 1,
rampUpPeriod: 5,
thinkTime: 1,
});
const [fileContent, setFileContent] = useState(null);
const [detectedFormat, setDetectedFormat] = useState("");
// Handle file upload
const handleFileUpload = (e) => {
const uploadedFile = e.target.files[0];
if (!uploadedFile) return;
const fileExtension = uploadedFile.name.split('.').pop().toLowerCase();
if (fileExtension !== "json" && fileExtension !== "xml" && fileExtension !== "yaml" && fileExtension !== "yml") {
showNotification("Please upload a valid JSON, XML, YAML, or YML file.", "error");
setFile(null);
return;
}
setFile(uploadedFile);
setError("");
setConvertedScript("");
// Read and analyze the file content
analyzeFile(uploadedFile);
};
// Extract and analyze the uploaded file
const analyzeFile = (uploadedFile) => {
setIsLoading(true);
const reader = new FileReader();
reader.onload = () => {
const content = reader.result;
setFileContent(content);
try {
let apiData = null;
let format = "";
const fileExtension = uploadedFile.name.split('.').pop().toLowerCase();
if (fileExtension === "json") {
const parsedContent = JSON.parse(content);
// Detect if it's a Postman collection
if (parsedContent && parsedContent.info && parsedContent.item) {
apiData = parsePostmanCollection(parsedContent);
format = "Postman Collection";
}
// Detect if it's Swagger 2.0
else if (parsedContent && parsedContent.swagger && parsedContent.swagger.startsWith("2")) {
apiData = parseSwaggerSpec(parsedContent);
format = "Swagger 2.0";
}
// Detect if it's OpenAPI 3.x
else if (parsedContent && parsedContent.openapi && parsedContent.openapi.startsWith("3")) {
apiData = parseOpenApiSpec(parsedContent);
format = "OpenAPI 3.x";
}
else {
throw new Error("Unknown JSON format. Supported formats: Postman Collection, Swagger 2.0, OpenAPI 3.x");
}
}
else if (fileExtension === "yaml" || fileExtension === "yml") {
const parsedContent = YAML.parse(content);
// Detect if it's Swagger 2.0
if (parsedContent && parsedContent.swagger && parsedContent.swagger.startsWith("2")) {
apiData = parseSwaggerSpec(parsedContent);
format = "Swagger 2.0 (YAML)";
}
// Detect if it's OpenAPI 3.x
else if (parsedContent && parsedContent.openapi && parsedContent.openapi.startsWith("3")) {
apiData = parseOpenApiSpec(parsedContent);
format = "OpenAPI 3.x (YAML)";
}
// Check if it's a Postman collection exported as YAML
else if (parsedContent && parsedContent.info && parsedContent.item) {
apiData = parsePostmanCollection(parsedContent);
format = "Postman Collection (YAML)";
}
else {
throw new Error("Unknown YAML format. Supported formats: Swagger 2.0, OpenAPI 3.x, Postman Collection");
}
}
else if (fileExtension === "xml") {
const parser = new DOMParser();
const xmlDoc = parser.parseFromString(content, "text/xml");
// Check if it's a SoapUI project
if (xmlDoc.getElementsByTagName('soapui-project').length > 0) {
apiData = parseSoapUI(xmlDoc);
format = "SoapUI Project";
} else {
throw new Error("Unsupported XML format. Only SoapUI projects are supported.");
}
}
if (apiData && apiData.endpoints) {
setApiEndpoints(apiData.endpoints);
setSelectedEndpoints(apiData.endpoints.map(endpoint => endpoint.id));
setDetectedFormat(format);
showNotification(`Successfully loaded ${format} with ${apiData.endpoints.length} endpoints`, "success");
} else {
throw new Error("Failed to extract API endpoints from the file.");
}
} catch (err) {
console.error("Parsing error:", err);
setError(err.message || "Error parsing the file. Please ensure the file format is correct.");
showNotification(err.message || "Error parsing the file", "error");
} finally {
setIsLoading(false);
}
};
reader.onerror = () => {
setError("Failed to read the file.");
showNotification("Failed to read the file", "error");
setIsLoading(false);
};
reader.readAsText(uploadedFile);
};
// Handle convert button click
const handleConvert = () => {
if (!file) {
showNotification("No file uploaded. Please upload a valid file.", "error");
return;
}
if (selectedEndpoints.length === 0) {
showNotification("No endpoints selected. Please select at least one endpoint.", "warning");
return;
}
setIsLoading(true);
try {
// Filter endpoints based on selection
const endpointsToConvert = apiEndpoints.filter(endpoint =>
selectedEndpoints.includes(endpoint.id)
);
// Prepare data for conversion
const dataForConversion = {
info: {
name: file.name.split('.')[0],
description: `Generated from ${detectedFormat}`,
version: '1.0.0'
},
endpoints: endpointsToConvert,
options: scriptOptions
};
// Generate the script based on selected tool
let toolScript = "";
switch (tool) {
case "jmeter":
toolScript = generateJMeterScript(dataForConversion);
break;
case "loadrunner":
toolScript = generateLoadRunnerScript(dataForConversion);
break;
case "gatling":
toolScript = generateGatlingScript(dataForConversion);
break;
case "k6":
toolScript = generateK6Script(dataForConversion);
break;
default:
toolScript = "// Unknown tool selected.";
}
setConvertedScript(toolScript);
showNotification(`Script successfully generated for ${tool}`, "success");
} catch (err) {
console.error("Conversion error:", err);
setError(`Error converting to ${tool} script: ${err.message}`);
showNotification(`Error converting to ${tool} script`, "error");
} finally {
setIsLoading(false);
}
};
// Handle download button click
const handleDownload = () => {
if (!convertedScript) {
showNotification("No script available to download.", "error");
return;
}
const blob = new Blob([convertedScript], { type: 'text/plain' });
const link = document.createElement('a');
link.href = URL.createObjectURL(blob);
// Set appropriate file extension based on tool
const fileName = file ? file.name.split('.')[0] : "converted";
link.download = tool === "jmeter" ? `${fileName}.jmx` :
tool === "loadrunner" ? `${fileName}.c` :
tool === "gatling" ? `${fileName}.scala` :
`${fileName}.js`;
link.click();
showNotification(`Downloaded ${link.download} successfully`, "success");
};
// Copy script to clipboard
const handleCopyToClipboard = () => {
if (!convertedScript) {
showNotification("No script available to copy.", "error");
return;
}
navigator.clipboard.writeText(convertedScript)
.then(() => showNotification("Script copied to clipboard", "success"))
.catch(err => showNotification("Failed to copy: " + err, "error"));
};
// Handle checkbox selection for endpoints
const handleEndpointSelection = (endpointId) => {
setSelectedEndpoints(prev => {
if (prev.includes(endpointId)) {
return prev.filter(id => id !== endpointId);
} else {
return [...prev, endpointId];
}
});
};
// Select or deselect all endpoints
const handleSelectAllEndpoints = (selectAll) => {
if (selectAll) {
setSelectedEndpoints(apiEndpoints.map(endpoint => endpoint.id));
} else {
setSelectedEndpoints([]);
}
};
// Show notification helper
const showNotification = (message, severity) => {
setNotification({
open: true,
message,
severity
});
};
// Handle notification close
const handleNotificationClose = () => {
setNotification(prev => ({ ...prev, open: false }));
};
// Handle tab change
const handleTabChange = (event, newValue) => {
setTabValue(newValue);
};
// Clear the uploaded file and reset state
const handleClearFile = () => {
setFile(null);
setFileContent(null);
setConvertedScript("");
setApiEndpoints([]);
setSelectedEndpoints([]);
setError("");
setDetectedFormat("");
};
// Get extension-specific icon/color
const getFileIcon = () => {
if (!file) return null;
const extension = file.name.split('.').pop().toLowerCase();
switch (extension) {
case 'json':
return <Chip
label="JSON"
size="small"
sx={{ bgcolor: '#ffa726', color: 'white', fontWeight: 'bold' }}
/>;
case 'xml':
return <Chip
label="XML"
size="small"
sx={{ bgcolor: '#5c6bc0', color: 'white', fontWeight: 'bold' }}
/>;
case 'yaml':
case 'yml':
return <Chip
label="YAML"
size="small"
sx={{ bgcolor: '#66bb6a', color: 'white', fontWeight: 'bold' }}
/>;
default:
return null;
}
};
// Render endpoints list panel
const renderEndpointsPanel = () => {
if (!apiEndpoints || apiEndpoints.length === 0) {
return (
<Box sx={{ p: 2, textAlign: 'center' }}>
<Typography color="text.secondary">
No endpoints available. Please upload an API collection.
</Typography>
</Box>
);
}
return (
<Box sx={{ p: 2 }}>
<Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
<Typography variant="subtitle1" fontWeight="bold">
{apiEndpoints.length} Endpoints Available
</Typography>
<Box>
<Button
size="small"
onClick={() => handleSelectAllEndpoints(true)}
sx={{ mr: 1 }}
>
Select All
</Button>
<Button
size="small"
onClick={() => handleSelectAllEndpoints(false)}
>
Deselect All
</Button>
</Box>
</Box>
<Divider sx={{ mb: 2 }} />
{apiEndpoints.map(endpoint => (
<Box
key={endpoint.id}
sx={{
display: 'flex',
alignItems: 'center',
p: 1,
mb: 1,
borderRadius: 1,
bgcolor: selectedEndpoints.includes(endpoint.id) ? 'rgba(132, 135, 162, 0.1)' : 'transparent',
'&:hover': { bgcolor: 'rgba(132, 135, 162, 0.05)' }
}}
>
<Chip
label={endpoint.method}
size="small"
sx={{
mr: 2,
fontWeight: 'bold',
bgcolor: endpoint.method === 'GET' ? '#4caf50' :
endpoint.method === 'POST' ? '#2196f3' :
endpoint.method === 'PUT' ? '#ff9800' :
endpoint.method === 'DELETE' ? '#f44336' :
'#9e9e9e',
color: 'white'
}}
/>
<Typography
variant="body2"
sx={{
flexGrow: 1,
overflow: 'hidden',
textOverflow: 'ellipsis',
cursor: 'pointer',
textDecoration: selectedEndpoints.includes(endpoint.id) ? 'none' : 'line-through',
color: selectedEndpoints.includes(endpoint.id) ? 'text.primary' : 'text.secondary'
}}
onClick={() => handleEndpointSelection(endpoint.id)}
>
{endpoint.path}
</Typography>
<Tooltip title={selectedEndpoints.includes(endpoint.id) ? "Deselect" : "Select"}>
<IconButton
size="small"
onClick={() => handleEndpointSelection(endpoint.id)}
>
{selectedEndpoints.includes(endpoint.id) ?
<span style={{ color: '#8487a2' }}>✓</span> :
<span>○</span>}
</IconButton>
</Tooltip>
</Box>
))}
</Box>
);
};
// Settings dialog
const renderSettingsDialog = () => (
<Dialog
open={showSettings}
onClose={() => setShowSettings(false)}
maxWidth="sm"
fullWidth
>
<DialogTitle>Performance Script Settings</DialogTitle>
<DialogContent>
<Grid container spacing={3} sx={{ mt: 0 }}>
<Grid item xs={12} sm={6}>
<TextField
fullWidth
label="Loop Count"
type="number"
value={scriptOptions.loopCount}
onChange={(e) => setScriptOptions(prev => ({ ...prev, loopCount: parseInt(e.target.value) || 1 }))}
inputProps={{ min: 1 }}
helperText="Number of times to execute each request"
/>
</Grid>
<Grid item xs={12} sm={6}>
<TextField
fullWidth
label="Ramp Up Period (seconds)"
type="number"
value={scriptOptions.rampUpPeriod}
onChange={(e) => setScriptOptions(prev => ({ ...prev, rampUpPeriod: parseInt(e.target.value) || 5 }))}
inputProps={{ min: 0 }}
helperText="Time to start all threads"
/>
</Grid>
<Grid item xs={12} sm={6}>
<TextField
fullWidth
label="Think Time (seconds)"
type="number"
value={scriptOptions.thinkTime}
onChange={(e) => setScriptOptions(prev => ({ ...prev, thinkTime: parseInt(e.target.value) || 1 }))}
inputProps={{ min: 0 }}
helperText="Pause between requests"
/>
</Grid>
<Grid item xs={12}>
<Typography variant="subtitle1" sx={{ mb: 2 }}>Script Options</Typography>
<Grid container spacing={2}>
<Grid item xs={12} sm={4}>
<FormControl fullWidth>
<InputLabel>Headers</InputLabel>
<Select
value={scriptOptions.includeHeaders ? "yes" : "no"}
label="Include Headers"
onChange={(e) => setScriptOptions(prev => ({ ...prev, includeHeaders: e.target.value === "yes" }))}
>
<MenuItem value="yes">Yes</MenuItem>
<MenuItem value="no">No</MenuItem>
</Select>
</FormControl>
</Grid>
<Grid item xs={12} sm={4}>
<FormControl fullWidth>
<InputLabel>Cookies</InputLabel>
<Select
value={scriptOptions.includeCookies ? "yes" : "no"}
label="Include Cookies"
onChange={(e) => setScriptOptions(prev => ({ ...prev, includeCookies: e.target.value === "yes" }))}
>
<MenuItem value="yes">Yes</MenuItem>
<MenuItem value="no">No</MenuItem>
</Select>
</FormControl>
</Grid>
<Grid item xs={12} sm={4}>
<FormControl fullWidth>
<InputLabel>Assertions</InputLabel>
<Select
value={scriptOptions.addAssertions ? "yes" : "no"}
label="Add Assertions"
onChange={(e) => setScriptOptions(prev => ({ ...prev, addAssertions: e.target.value === "yes" }))}
>
<MenuItem value="yes">Yes</MenuItem>
<MenuItem value="no">No</MenuItem>
</Select>
</FormControl>
</Grid>
</Grid>
</Grid>
</Grid>
</DialogContent>
<DialogActions>
<Button onClick={() => setShowSettings(false)}>Close</Button>
</DialogActions>
</Dialog>
);
return (
<Container maxWidth="lg" sx={{ minHeight: "100vh", py: 6, display: "flex", flexDirection: "column" }}>
{/* Logo and App Title */}
<Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", mb: 4 }}>
<img src={process.env.PUBLIC_URL + '/logo.jpg'} alt="App Logo" style={{ height: "150px", width: "auto", marginRight: "16px" }} />

<Typography variant="h3" fontWeight="bold" sx={{ color: "#8487a2" }}>perfAPIScriptor</Typography>
</Box>
{/* Main Content */}
<Card variant="outlined" sx={{ mb: 4, overflow: 'visible' }}>
<CardContent>
{/* Error Message */}
{error && (
<Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>
)}
{/* File Upload Section */}
<Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
<Button
variant="outlined"
component="label"
startIcon={<FileUploadOutlinedIcon />}
sx={{
textTransform: "none",
backgroundColor: "#f5f5f5",
color: "#3f51b5",
padding: "10px 20px",
borderRadius: "8px",
":hover": { backgroundColor: "#e3e3e3" },
}}
>
Upload API Collection
<input type="file" hidden accept=".json,.xml,.yaml,.yml" onChange={handleFileUpload} />
</Button>
{file && (
<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
{getFileIcon()}
<Typography
variant="body2"
sx={{
padding: "6px 12px",
borderRadius: "4px",
backgroundColor: "#e6f4ff",
fontWeight: "bold"
}}
>
{file.name}
</Typography>
{detectedFormat && (
<Chip
label={detectedFormat}
size="small"
color="primary"
variant="outlined"
/>
)}
<Tooltip title="Remove file">
<IconButton size="small" onClick={handleClearFile}>
<DeleteIcon fontSize="small" />
</IconButton>
</Tooltip>
</Box>
)}
</Box>
{/* Tool Selection and Settings - Changed to be on different lines */}

{/* Tool Selection - Full width row */}

<FormControl fullWidth>
<InputLabel id="tool-select-label">Select Performance Tool</InputLabel>
<Select
labelId="tool-select-label"
value={tool}
label="Select Performance Tool"
onChange={(e) => setTool(e.target.value)}
>
<MenuItem value="jmeter">Apache JMeter</MenuItem>
<MenuItem value="loadrunner">LoadRunner</MenuItem>
<MenuItem value="gatling">Gatling</MenuItem>
<MenuItem value="k6">k6</MenuItem>
</Select>
</FormControl>





{/* Settings and Convert Buttons - Separate row */}

<p></p>
<Box sx={{ display: 'flex' }}>
<Button
variant="outlined"
startIcon={<SettingsIcon />}
onClick={() => setShowSettings(true)}
sx={{ mr: 2 }}
>
Settings
</Button>
<Button
variant="contained"
startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : <FileUploadOutlinedIcon />}
onClick={handleConvert}
disabled={isLoading || !file || selectedEndpoints.length === 0}
size="medium"
sx={{
backgroundColor: "#8487a2",
color: "#fff",
":hover": { backgroundColor: "#6e6e6e" }
}}
>
{isLoading ? "Converting..." : "Convert"}
</Button>
</Box>

{/* Tabs for Endpoints and Script */}
<Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
<Tabs value={tabValue} onChange={handleTabChange} aria-label="script tabs">
<Tab icon={<ListAltIcon />} iconPosition="start" label="API Endpoints" />
<Tab icon={<CodeIcon />} iconPosition="start" label="Generated Script" disabled={!convertedScript} />
</Tabs>
</Box>
{/* Tab Panels */}
<Box sx={{ mt: 2 }}>
{/* Endpoints Panel */}
{tabValue === 0 && renderEndpointsPanel()}
{/* Script Panel */}
{tabValue === 1 && (
<Box>
<Box display="flex" justifyContent="flex-end" alignItems="center" mb={2}>
<Button
variant="outlined"
startIcon={<ContentCopyIcon />}
onClick={handleCopyToClipboard}
sx={{ mr: 2 }}
>
Copy
</Button>
<Button
variant="contained"
startIcon={<DownloadIcon />}
onClick={handleDownload}
>
Download
</Button>
</Box>
<Box
component="pre"
sx={{
backgroundColor: "#1a1a1a",
color: "#9fef00",
padding: 2,
borderRadius: 2,
overflowX: "auto",
fontSize: 14,
height: '400px',
resize: 'vertical'
}}
>
{convertedScript || "// Generated script will appear here..."}
</Box>
</Box>
)}
</Box>
</CardContent>
</Card>
{/* Help Card */}
<Card variant="outlined" sx={{ mb: 4 }}>
<CardContent>
<Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
<HelpOutlineIcon sx={{ mr: 1, color: '#8487a2' }} />
<Typography variant="h6">How to Use</Typography>
</Box>
<Typography variant="body2" color="text.secondary" paragraph>
1. Upload your API collection file (Postman Collection, Swagger/OpenAPI spec, or SoapUI project)
</Typography>
<Typography variant="body2" color="text.secondary" paragraph>
2. Select which performance testing tool you want to generate scripts for
</Typography>
<Typography variant="body2" color="text.secondary" paragraph>
3. Choose which API endpoints to include in your performance script
</Typography>
<Typography variant="body2" color="text.secondary" paragraph>
4. Configure additional settings if needed (optional)
</Typography>
<Typography variant="body2" color="text.secondary" paragraph>
5. Click "Convert" to generate your performance testing script
</Typography>
</CardContent>
</Card>
{/* Footer */}
<Typography variant="body2" align="center" color="text.secondary" sx={{ mt: 'auto', pt: 2 }}>
  &copy; {new Date().getFullYear()} Developed & designed by{' '}
  <a href="https://www.linkedin.com/in/balaji-salavakkam-gunasekaran-06472294?trk=contact-info" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', color: 'inherit' }}>
    Balaji Salavakkam Gunasekaran
  </a>
</Typography>

{/* Notification */}
<Snackbar
open={notification.open}
autoHideDuration={6000}
onClose={handleNotificationClose}
anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
>
<Alert onClose={handleNotificationClose} severity={notification.severity} sx={{ width: '100%' }}>
{notification.message}
</Alert>
</Snackbar>
{/* Settings Dialog */}
{renderSettingsDialog()}
</Container>
);
}
