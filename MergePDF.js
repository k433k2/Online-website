import React, { useState, useContext } from 'react';
import { 
  Container,
  Paper,
  Typography,
  Button,
  Box,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  CircularProgress
} from '@material-ui/core';
import { CloudUpload, Delete, CloudDownload } from '@material-ui/icons';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';
import AuthContext from '../../context/auth/authContext';

const MergePDF = () => {
  const { user, showAlert, setLoading } = useContext(AuthContext);
  const [files, setFiles] = useState([]);
  const [resultUrl, setResultUrl] = useState('');

  const { getRootProps, getInputProps } = useDropzone({
    accept: 'application/pdf',
    maxFiles: 10,
    onDrop: acceptedFiles => {
      setFiles(prevFiles => [
        ...prevFiles,
        ...acceptedFiles.map(file => 
          Object.assign(file, {
            preview: URL.createObjectURL(file)
          })
        )
      ]);
    }
  });

  const removeFile = index => {
    const newFiles = [...files];
    newFiles.splice(index, 1);
    setFiles(newFiles);
  };

  const handleSubmit = async () => {
    if (files.length < 2) {
      showAlert('Please upload at least 2 PDF files', 'error');
      return;
    }

    try {
      setLoading(true);
      const formData = new FormData();
      files.forEach(file => formData.append('files', file));

      const res = await axios.post('/api/pdf/merge', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      setResultUrl(res.data.downloadUrl);
      showAlert('PDFs merged successfully!', 'success');
    } catch (err) {
      showAlert(err.response?.data?.errors?.[0]?.msg || 'Error merging PDFs', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="md">
      <Paper elevation={3} style={{ padding: '2rem', marginTop: '2rem' }}>
        <Typography variant="h4" gutterBottom>
          Merge PDF Files
        </Typography>
        <Typography variant="body1" gutterBottom>
          Combine multiple PDF files into a single document in seconds.
        </Typography>

        <Box 
          {...getRootProps()} 
          style={{
            border: '2px dashed #4caf50',
            borderRadius: '4px',
            padding: '2rem',
            textAlign: 'center',
            margin: '1rem 0',
            cursor: 'pointer'
          }}
        >
          <input {...getInputProps()} />
          <CloudUpload fontSize="large" />
          <Typography>Drag and drop PDF files here, or click to select files</Typography>
          <Typography variant="caption">(Maximum 10 files)</Typography>
        </Box>

        {files.length > 0 && (
          <>
            <List>
              {files.map((file, index) => (
                <ListItem key={index}>
                  <ListItemText 
                    primary={file.name} 
                    secondary={`${(file.size / 1024).toFixed(2)} KB`} 
                  />
                  <ListItemSecondaryAction>
                    <IconButton edge="end" onClick={() => removeFile(index)}>
                      <Delete color="error" />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>

            <Button
              variant="contained"
              color="primary"
              onClick={handleSubmit}
              disabled={files.length < 2}
              fullWidth
            >
              Merge PDFs
            </Button>
          </>
        )}

        {resultUrl && (
          <Box mt={4} textAlign="center">
            <Typography variant="h6" gutterBottom>
              Your merged PDF is ready!
            </Typography>
            <Button
              variant="contained"
              color="secondary"
              startIcon={<CloudDownload />}
              href={resultUrl}
              download
            >
              Download Merged PDF
            </Button>
          </Box>
        )}
      </Paper>
    </Container>
  );
};

export default MergePDF;
