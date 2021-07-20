import React, {Component} from 'react';
import {StyleSheet, View} from 'react-native';
import Modal, { ModalProps } from 'react-native-modal';

type PropType = Partial<ModalProps> & {

};

type State = {
  visible: boolean;
};

class ModalBaseScene extends Component<PropType, State> {
   
  constructor(props: PropType) {
    super(props);

    this.state = {
      visible: true,
    };

  }

  open = () => this.setState({visible: true} as any);
  close = () => this.setState({visible: false} as any);
  onSwipeComplete = () => this.props.onClose;

  isVisible = () => this.state.visible;
  
  render() {
    const mergedStyles = [styles.view, this.props.style];
    return (
      <View style={styles.view}>
        <Modal
          // default props :
          testID={'modal'}
          isVisible={this.state.visible}
          onSwipeComplete={this.close.bind(this)}
          swipeDirection={['down']}
          // custom props :
          { ...this.props}
          // merged styles :
          style={mergedStyles}
          >
            { this.props.children }
        </Modal>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  view: {
    flex: 1,
  },
});

export default ModalBaseScene;
